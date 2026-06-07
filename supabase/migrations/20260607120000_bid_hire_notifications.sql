-- Extend notification_type enum with bid and hire events
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'bid_received';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'hired';

-- ─── BID SUBMITTED: notify partner ──────────────────────────────────────────
-- Fires on every INSERT into bids.
-- 1. Platform notification to partner
-- 2. Inbox message from expert to partner (creates conversation if needed)

CREATE OR REPLACE FUNCTION public.notify_bid_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project       record;
  _expert_name   text;
  _conv_id       uuid;
  _a             uuid;
  _b             uuid;
  _msg           text;
BEGIN
  -- Fetch project and expert name
  SELECT pp.buyer_id, pp.title
    INTO _project
    FROM public.project_posts pp
   WHERE pp.id = NEW.project_id;

  IF _project.buyer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'An expert')
    INTO _expert_name
    FROM public.profiles
   WHERE id = NEW.seller_id;

  -- 1. Platform notification → partner
  PERFORM public.create_notification(
    _project.buyer_id,
    'bid_received'::notification_type,
    'New bid from ' || _expert_name,
    _expert_name || ' bid $' || NEW.bid_amount || ' on your project: ' || _project.title,
    '/buyer/hq'
  );

  -- 2. Inbox message → partner (get or create conversation)
  _a := LEAST(NEW.seller_id, _project.buyer_id);
  _b := GREATEST(NEW.seller_id, _project.buyer_id);

  INSERT INTO public.conversations (participant_one, participant_two)
  VALUES (_a, _b)
  ON CONFLICT (participant_one, participant_two) DO NOTHING;

  SELECT id INTO _conv_id
    FROM public.conversations
   WHERE participant_one = _a AND participant_two = _b;

  IF _conv_id IS NOT NULL THEN
    _msg := 'Hi, I''ve placed a bid of $' || NEW.bid_amount
         || ' on your project "' || _project.title || '". '
         || 'Delivery in ' || NEW.delivery_days || ' days. '
         || left(NEW.cover_message, 100);

    INSERT INTO public.messages (conversation_id, sender_id, recipient_id, content)
    VALUES (_conv_id, NEW.seller_id, _project.buyer_id, _msg);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bid_submitted ON public.bids;
CREATE TRIGGER trg_bid_submitted
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_bid_submitted();


-- ─── BID ACCEPTED (HIRED): notify expert ─────────────────────────────────────
-- Fires when bids.status changes to 'accepted'.
-- 1. Platform notification to expert
-- 2. Inbox message from partner to expert

CREATE OR REPLACE FUNCTION public.notify_bid_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project       record;
  _partner_name  text;
  _conv_id       uuid;
  _a             uuid;
  _b             uuid;
  _msg           text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'accepted' THEN

    SELECT pp.buyer_id, pp.title
      INTO _project
      FROM public.project_posts pp
     WHERE pp.id = NEW.project_id;

    IF _project.buyer_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(full_name, username, 'Your client')
      INTO _partner_name
      FROM public.profiles
     WHERE id = _project.buyer_id;

    -- 1. Platform notification → expert
    PERFORM public.create_notification(
      NEW.seller_id,
      'hired'::notification_type,
      'You got hired by ' || _partner_name,
      'Start working on: ' || _project.title
        || ' — $' || NEW.bid_amount
        || ' — due in ' || NEW.delivery_days || ' days',
      '/seller/hq'
    );

    -- 2. Inbox message → expert (partner sends the congratulations message)
    _a := LEAST(NEW.seller_id, _project.buyer_id);
    _b := GREATEST(NEW.seller_id, _project.buyer_id);

    INSERT INTO public.conversations (participant_one, participant_two)
    VALUES (_a, _b)
    ON CONFLICT (participant_one, participant_two) DO NOTHING;

    SELECT id INTO _conv_id
      FROM public.conversations
     WHERE participant_one = _a AND participant_two = _b;

    IF _conv_id IS NOT NULL THEN
      _msg := 'Congratulations! I have hired you for "' || _project.title || '". '
           || 'Budget: $' || NEW.bid_amount || '. '
           || 'Please deliver within ' || NEW.delivery_days || ' days. '
           || 'Looking forward to working with you.';

      INSERT INTO public.messages (conversation_id, sender_id, recipient_id, content)
      VALUES (_conv_id, _project.buyer_id, NEW.seller_id, _msg);
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bid_accepted ON public.bids;
CREATE TRIGGER trg_bid_accepted
  AFTER UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_bid_accepted();
