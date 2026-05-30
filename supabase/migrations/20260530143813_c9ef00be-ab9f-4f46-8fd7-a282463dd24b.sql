-- Indexes to support response-stats recomputation
CREATE INDEX IF NOT EXISTS idx_messages_conv_sender_created
  ON public.messages (conversation_id, sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations (participant_one);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations (participant_two);

-- Bounded, indexed recomputation
CREATE OR REPLACE FUNCTION public.recompute_seller_response_stats(_seller uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total int;
  _responded int;
  _median int;
  _cutoff timestamptz := now() - interval '90 days';
BEGIN
  WITH convos AS (
    SELECT c.id AS conversation_id,
           CASE WHEN c.participant_one = _seller THEN c.participant_two ELSE c.participant_one END AS buyer_id
    FROM public.conversations c
    WHERE (c.participant_one = _seller OR c.participant_two = _seller)
      AND c.last_message_at >= _cutoff
  ),
  first_buyer_msg AS (
    SELECT m.conversation_id, MIN(m.created_at) AS first_at
    FROM public.messages m
    JOIN convos cv ON cv.conversation_id = m.conversation_id
    WHERE m.sender_id = cv.buyer_id AND m.created_at >= _cutoff
    GROUP BY m.conversation_id
  ),
  first_seller_reply AS (
    SELECT m.conversation_id, MIN(m.created_at) AS reply_at
    FROM public.messages m
    JOIN first_buyer_msg fb ON fb.conversation_id = m.conversation_id
    WHERE m.sender_id = _seller AND m.created_at > fb.first_at
    GROUP BY m.conversation_id
  ),
  joined AS (
    SELECT fb.conversation_id, fb.first_at, fr.reply_at,
           EXTRACT(EPOCH FROM (fr.reply_at - fb.first_at))/60 AS minutes
    FROM first_buyer_msg fb
    LEFT JOIN first_seller_reply fr ON fr.conversation_id = fb.conversation_id
  )
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE reply_at IS NOT NULL),
         COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes) FILTER (WHERE minutes IS NOT NULL), 0)::int
    INTO _total, _responded, _median
  FROM joined;

  UPDATE public.profiles
    SET response_rate = CASE WHEN _total > 0 THEN ROUND((_responded::numeric / _total) * 100, 1) ELSE NULL END,
        response_time_minutes = CASE WHEN _responded > 0 THEN _median ELSE NULL END
    WHERE id = _seller;
END;
$$;

-- Trigger: skip when the seller already replied earlier in this conversation
-- (the stat is unchanged), avoiding the heavy recompute on every chat message.
CREATE OR REPLACE FUNCTION public.trg_message_response_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.seller_accounts WHERE seller_id = NEW.sender_id) THEN
    RETURN NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.messages
    WHERE conversation_id = NEW.conversation_id
      AND sender_id = NEW.sender_id
      AND created_at < NEW.created_at
  ) THEN
    RETURN NULL;
  END IF;
  PERFORM public.recompute_seller_response_stats(NEW.sender_id);
  RETURN NULL;
END;
$$;