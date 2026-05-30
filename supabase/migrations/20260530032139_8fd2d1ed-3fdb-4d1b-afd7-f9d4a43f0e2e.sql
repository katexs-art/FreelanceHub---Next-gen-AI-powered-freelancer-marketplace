
-- 1. Extend orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS project_title text,
  ADD COLUMN IF NOT EXISTS bid_id uuid,
  ADD COLUMN IF NOT EXISTS pitch_message_id uuid,
  ADD COLUMN IF NOT EXISTS dispute_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_halfway_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_late_sent_at timestamptz;

ALTER TABLE public.orders ALTER COLUMN gig_id DROP NOT NULL;

-- Add 'late' to order_status enum if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'order_status' AND e.enumlabel = 'late') THEN
    ALTER TYPE public.order_status ADD VALUE 'late';
  END IF;
END $$;

-- 2. create_escrow_order
CREATE OR REPLACE FUNCTION public.create_escrow_order(_source text, _source_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _buyer uuid; _seller uuid;
  _price int; _days int;
  _title text;
  _fee int; _earn int;
  _order_id uuid;
  _bid record;
  _msg record;
  _proj record;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  IF _source = 'bid' THEN
    SELECT * INTO _bid FROM public.bids WHERE id = _source_id;
    IF _bid IS NULL THEN RAISE EXCEPTION 'bid not found'; END IF;
    SELECT * INTO _proj FROM public.project_posts WHERE id = _bid.project_id;
    IF _proj.buyer_id <> _me THEN RAISE EXCEPTION 'forbidden'; END IF;
    _buyer := _me;
    _seller := _bid.seller_id;
    _price := _bid.bid_amount;
    _days := _bid.delivery_days;
    _title := _proj.title;
  ELSIF _source = 'pitch' THEN
    SELECT * INTO _msg FROM public.messages WHERE id = _source_id AND message_type = 'pitch';
    IF _msg IS NULL THEN RAISE EXCEPTION 'pitch not found'; END IF;
    IF _msg.recipient_id <> _me THEN RAISE EXCEPTION 'forbidden'; END IF;
    _buyer := _me;
    _seller := _msg.sender_id;
    _price := COALESCE(_msg.pitch_price, 0) / 100; -- pitch_price stored in cents
    _days := COALESCE(_msg.pitch_delivery_days, 7);
    _title := COALESCE(LEFT(_msg.content, 80), 'Custom project');
  ELSE
    RAISE EXCEPTION 'invalid source';
  END IF;

  IF _price <= 0 THEN RAISE EXCEPTION 'invalid price'; END IF;

  _fee := ROUND(_price * 0.10);
  _earn := _price - _fee;

  INSERT INTO public.orders(
    buyer_id, seller_id, price, platform_fee, seller_earnings,
    status, escrow_status, requirements_submitted,
    project_title, bid_id, pitch_message_id,
    delivery_deadline
  ) VALUES (
    _buyer, _seller, _price, _fee, _earn,
    'pending_payment'::order_status, 'none', true,
    _title,
    CASE WHEN _source='bid' THEN _source_id END,
    CASE WHEN _source='pitch' THEN _source_id END,
    now() + (_days || ' days')::interval
  ) RETURNING id INTO _order_id;

  RETURN _order_id;
END $$;

GRANT EXECUTE ON FUNCTION public.create_escrow_order(text, uuid) TO authenticated;

-- 3. approve_delivery
CREATE OR REPLACE FUNCTION public.approve_delivery(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _o record;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF _o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _o.buyer_id <> _me THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _o.status <> 'delivered' THEN RAISE EXCEPTION 'order not delivered'; END IF;

  UPDATE public.orders SET
    status = 'completed',
    completed_at = now(),
    escrow_status = 'released',
    escrow_released_at = now(),
    updated_at = now()
  WHERE id = _order_id;

  UPDATE public.transactions
    SET status = 'cleared', clears_at = now()
  WHERE order_id = _order_id AND type = 'seller_credit' AND status = 'pending';

  PERFORM public.create_notification(
    _o.seller_id, 'order'::notification_type,
    'Your delivery was approved — your funds are being released now.',
    NULL, '/orders/' || _order_id::text
  );
END $$;

GRANT EXECUTE ON FUNCTION public.approve_delivery(uuid) TO authenticated;

-- 4. raise_dispute
CREATE OR REPLACE FUNCTION public.raise_dispute(_order_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _o record;
  _admin_id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF _o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _me <> _o.buyer_id AND _me <> _o.seller_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _o.status <> 'delivered' THEN RAISE EXCEPTION 'order not delivered'; END IF;

  UPDATE public.orders SET status = 'disputed', updated_at = now() WHERE id = _order_id;

  INSERT INTO public.disputes(order_id, raised_by, reason, description, status)
  VALUES (_order_id, _me, COALESCE(_reason,'Dispute'), _reason, 'open');

  PERFORM public.create_notification(_o.buyer_id, 'order'::notification_type,
    'A dispute has been opened on this order — our team will review within 24 hours.',
    NULL, '/orders/' || _order_id::text);
  PERFORM public.create_notification(_o.seller_id, 'order'::notification_type,
    'A dispute has been opened on this order — our team will review within 24 hours.',
    NULL, '/orders/' || _order_id::text);

  FOR _admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    PERFORM public.create_notification(_admin_id, 'order'::notification_type,
      'Order flagged for review',
      'A dispute was opened — review now.',
      '/orders/' || _order_id::text);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.raise_dispute(uuid, text) TO authenticated;

-- 5. Trigger to set dispute_deadline when an order becomes 'delivered'
CREATE OR REPLACE FUNCTION public.orders_set_dispute_deadline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'delivered' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'delivered') THEN
    IF NEW.dispute_deadline IS NULL THEN
      NEW.dispute_deadline := now() + interval '3 days';
    END IF;
    IF NEW.auto_complete_at IS NULL THEN
      NEW.auto_complete_at := NEW.dispute_deadline;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_set_dispute_deadline ON public.orders;
CREATE TRIGGER orders_set_dispute_deadline
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_set_dispute_deadline();

-- 6. Extend auto_complete_orders to also release escrow + clear seller credits
CREATE OR REPLACE FUNCTION public.auto_complete_orders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ids uuid[];
BEGIN
  SELECT array_agg(id) INTO _ids FROM public.orders
   WHERE status = 'delivered'
     AND auto_complete_at IS NOT NULL
     AND auto_complete_at <= now();

  IF _ids IS NULL THEN RETURN; END IF;

  UPDATE public.orders
     SET status = 'completed', completed_at = now(),
         escrow_status = CASE WHEN escrow_status = 'held' THEN 'released' ELSE escrow_status END,
         escrow_released_at = CASE WHEN escrow_status = 'held' THEN now() ELSE escrow_released_at END,
         updated_at = now()
   WHERE id = ANY(_ids);

  UPDATE public.transactions
     SET status = 'cleared', clears_at = now()
   WHERE order_id = ANY(_ids) AND type = 'seller_credit' AND status = 'pending';
END $$;
