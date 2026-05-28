
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
BEGIN
  -- conversations where this seller is a participant and the other party sent the first message
  WITH convos AS (
    SELECT c.id AS conversation_id,
           CASE WHEN c.participant_one = _seller THEN c.participant_two ELSE c.participant_one END AS buyer_id
    FROM public.conversations c
    WHERE c.participant_one = _seller OR c.participant_two = _seller
  ),
  first_buyer_msg AS (
    SELECT m.conversation_id, MIN(m.created_at) AS first_at
    FROM public.messages m
    JOIN convos cv ON cv.conversation_id = m.conversation_id
    WHERE m.sender_id = cv.buyer_id
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

CREATE OR REPLACE FUNCTION public.trg_message_response_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- recompute only when the sender is a seller (has a seller_accounts row)
  IF EXISTS (SELECT 1 FROM public.seller_accounts WHERE seller_id = NEW.sender_id) THEN
    PERFORM public.recompute_seller_response_stats(NEW.sender_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS messages_after_insert_response_stats ON public.messages;
CREATE TRIGGER messages_after_insert_response_stats
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.trg_message_response_stats();
