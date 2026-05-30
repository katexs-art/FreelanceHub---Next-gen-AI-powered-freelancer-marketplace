
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS pitch_price integer,
  ADD COLUMN IF NOT EXISTS pitch_delivery_days integer;

DROP FUNCTION IF EXISTS public.submit_river_pitch(uuid, text);
DROP FUNCTION IF EXISTS public.submit_river_pitch(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION public.submit_river_pitch(
  _search_id uuid,
  _content text,
  _price integer,
  _delivery_days integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _buyer uuid;
  _a uuid; _b uuid;
  _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _content IS NULL OR length(trim(_content)) = 0 THEN RAISE EXCEPTION 'pitch required'; END IF;
  IF _price IS NULL OR _price <= 0 THEN RAISE EXCEPTION 'price required'; END IF;
  IF _delivery_days IS NULL OR _delivery_days <= 0 THEN RAISE EXCEPTION 'delivery days required'; END IF;

  SELECT buyer_id INTO _buyer FROM public.buyer_searches WHERE id = _search_id;
  IF _buyer IS NULL THEN RAISE EXCEPTION 'search not found'; END IF;
  IF _buyer = _me THEN RAISE EXCEPTION 'cannot pitch yourself'; END IF;

  IF _me < _buyer THEN _a := _me; _b := _buyer; ELSE _a := _buyer; _b := _me; END IF;

  SELECT id INTO _conv FROM public.conversations
    WHERE participant_one = _a AND participant_two = _b;
  IF _conv IS NULL THEN
    INSERT INTO public.conversations(participant_one, participant_two)
      VALUES (_a, _b) RETURNING id INTO _conv;
  END IF;

  INSERT INTO public.messages(conversation_id, sender_id, recipient_id, content, message_type, pitch_price, pitch_delivery_days)
    VALUES (_conv, _me, _buyer, _content, 'pitch', _price, _delivery_days);

  BEGIN
    IF EXISTS(SELECT 1 FROM public.profiles WHERE id = _buyer) THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (
        _buyer,
        'message'::notification_type,
        'A top expert sent you a pitch',
        'A top expert sent you a pitch — review it now.',
        '/inbox/' || _conv::text
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN _conv;
END
$function$;
