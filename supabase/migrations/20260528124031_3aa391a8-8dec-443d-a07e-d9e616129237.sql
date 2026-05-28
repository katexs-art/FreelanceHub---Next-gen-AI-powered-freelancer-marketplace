
-- =========================================================================
-- 1. Auto-complete orders 3 days after delivery
-- =========================================================================
CREATE OR REPLACE FUNCTION public.auto_complete_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
     SET status = 'completed',
         completed_at = now(),
         updated_at = now()
   WHERE status = 'delivered'
     AND auto_complete_at IS NOT NULL
     AND auto_complete_at <= now();
END;
$$;

-- =========================================================================
-- 2. Two-way review gating
--    On insert, force is_public=false. Auto-publish in 3 cases:
--      a) both parties have submitted a review on this order
--      b) the review is 14 days old
--      c) the order's auto_complete fires (handled via cron pass)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.reviews_gate_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _other_exists boolean;
BEGIN
  -- Always start hidden
  NEW.is_public := false;

  -- If the counterpart already left a review, publish both immediately
  SELECT EXISTS (
    SELECT 1 FROM public.reviews
     WHERE order_id = NEW.order_id
       AND reviewer_role <> NEW.reviewer_role
  ) INTO _other_exists;

  IF _other_exists THEN
    NEW.is_public := true;
    UPDATE public.reviews SET is_public = true
      WHERE order_id = NEW.order_id AND id <> NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_gate ON public.reviews;
CREATE TRIGGER trg_reviews_gate
BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_gate_visibility();

CREATE OR REPLACE FUNCTION public.auto_publish_reviews()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.reviews
     SET is_public = true
   WHERE is_public = false
     AND created_at <= now() - interval '14 days';
$$;

-- =========================================================================
-- 3. Expire promotions whose end date has passed
-- =========================================================================
CREATE OR REPLACE FUNCTION public.expire_promotions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.gig_promotions
     SET status = 'expired'
   WHERE status = 'active'
     AND ends_at <= now();
$$;

-- =========================================================================
-- 4. Online-status heartbeat RPC
-- =========================================================================
CREATE OR REPLACE FUNCTION public.heartbeat_online()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET is_online = true,
         last_seen = now()
   WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mark_offline_stale()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET is_online = false
   WHERE is_online = true
     AND (last_seen IS NULL OR last_seen <= now() - interval '5 minutes');
$$;

GRANT EXECUTE ON FUNCTION public.heartbeat_online() TO authenticated;

-- =========================================================================
-- 5. Notification triggers we were missing
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _o record;
BEGIN
  SELECT buyer_id, seller_id, order_number INTO _o FROM public.orders WHERE id = NEW.order_id;
  PERFORM public.create_notification(
    _o.buyer_id, 'order'::notification_type,
    CASE WHEN NEW.is_revision THEN 'Revision delivered for ' ELSE 'Delivery received for ' END || _o.order_number,
    NEW.message,
    '/orders/' || NEW.order_id::text
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_delivery ON public.order_deliveries;
CREATE TRIGGER trg_notify_delivery
AFTER INSERT ON public.order_deliveries
FOR EACH ROW EXECUTE FUNCTION public.notify_on_delivery();

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _name text;
BEGIN
  SELECT COALESCE(full_name, username, 'Someone') INTO _name FROM public.profiles WHERE id = NEW.follower_id;
  PERFORM public.create_notification(
    NEW.seller_id, 'system'::notification_type,
    _name || ' followed you', NULL, '/u/' || COALESCE(
      (SELECT username FROM public.profiles WHERE id = NEW.follower_id), NEW.follower_id::text
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_follow ON public.seller_follows;
CREATE TRIGGER trg_notify_follow
AFTER INSERT ON public.seller_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Wire the existing notify functions to their tables if not yet wired
DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_status();

DROP TRIGGER IF EXISTS trg_notify_offer ON public.custom_offers;
CREATE TRIGGER trg_notify_offer
AFTER INSERT OR UPDATE ON public.custom_offers
FOR EACH ROW EXECUTE FUNCTION public.notify_on_custom_offer();

DROP TRIGGER IF EXISTS trg_notify_dispute ON public.disputes;
CREATE TRIGGER trg_notify_dispute
AFTER INSERT ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_dispute();

DROP TRIGGER IF EXISTS trg_notify_cancel ON public.cancellation_requests;
CREATE TRIGGER trg_notify_cancel
AFTER INSERT ON public.cancellation_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_cancellation();

DROP TRIGGER IF EXISTS trg_followers_new_gig ON public.gigs;
CREATE TRIGGER trg_followers_new_gig
AFTER INSERT OR UPDATE OF status ON public.gigs
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_new_gig();

DROP TRIGGER IF EXISTS trg_bump_conv ON public.messages;
CREATE TRIGGER trg_bump_conv
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

DROP TRIGGER IF EXISTS trg_msg_response_stats ON public.messages;
CREATE TRIGGER trg_msg_response_stats
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.trg_message_response_stats();

DROP TRIGGER IF EXISTS trg_gig_search_vector ON public.gigs;
CREATE TRIGGER trg_gig_search_vector
BEFORE INSERT OR UPDATE OF title, description, tags ON public.gigs
FOR EACH ROW EXECUTE FUNCTION public.gigs_set_search_vector();

DROP TRIGGER IF EXISTS trg_review_recompute_rating ON public.reviews;
CREATE TRIGGER trg_review_recompute_rating
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_gig_rating_on_review();

DROP TRIGGER IF EXISTS trg_tx_clears_at ON public.transactions;
CREATE TRIGGER trg_tx_clears_at
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.tx_set_clears_at();

DROP TRIGGER IF EXISTS trg_tx_recompute_balance ON public.transactions;
CREATE TRIGGER trg_tx_recompute_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_transaction();

DROP TRIGGER IF EXISTS trg_wd_recompute_balance ON public.withdrawals;
CREATE TRIGGER trg_wd_recompute_balance
AFTER INSERT OR UPDATE OR DELETE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_withdrawal();

-- =========================================================================
-- 6. Realtime publications
-- =========================================================================
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.disputes REPLICA IDENTITY FULL;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='orders';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='disputes';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes; END IF;
END $$;

-- =========================================================================
-- 7. Cron extensions
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
