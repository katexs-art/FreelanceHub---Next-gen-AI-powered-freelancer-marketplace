
-- 1. Add new notification type value
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
                  WHERE t.typname='notification_type' AND e.enumlabel='river_match') THEN
    ALTER TYPE public.notification_type ADD VALUE 'river_match';
  END IF;
END $$;

-- 2. buyer_searches table
CREATE TABLE IF NOT EXISTS public.buyer_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.buyer_searches TO authenticated;
GRANT ALL ON public.buyer_searches TO service_role;

ALTER TABLE public.buyer_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY bs_auth_read ON public.buyer_searches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY bs_own_insert ON public.buyer_searches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- 3. RPC: record search + notify matched sellers
CREATE OR REPLACE FUNCTION public.notify_river_match(_query text, _seller_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _search_id uuid;
  _sid uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _query IS NULL OR length(trim(_query)) = 0 THEN RAISE EXCEPTION 'query required'; END IF;

  INSERT INTO public.buyer_searches(buyer_id, query) VALUES (_me, _query)
    RETURNING id INTO _search_id;

  IF _seller_ids IS NOT NULL THEN
    FOREACH _sid IN ARRAY _seller_ids LOOP
      IF _sid IS NULL OR _sid = _me THEN CONTINUE; END IF;
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (
        _sid,
        'river_match'::notification_type,
        'River matched you to a new buyer',
        'A buyer is looking for exactly what you offer. Send them your best pitch now — be the first to respond.',
        '/pitch/' || _search_id::text
      );
    END LOOP;
  END IF;

  RETURN _search_id;
END $$;

-- 4. RPC: submit a river pitch — creates conversation, first message, buyer notification
CREATE OR REPLACE FUNCTION public.submit_river_pitch(_search_id uuid, _content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _buyer uuid;
  _a uuid; _b uuid;
  _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _content IS NULL OR length(trim(_content)) = 0 THEN RAISE EXCEPTION 'pitch required'; END IF;

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

  INSERT INTO public.messages(conversation_id, sender_id, recipient_id, content)
    VALUES (_conv, _me, _buyer, _content);

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    _buyer,
    'message'::notification_type,
    'A top expert responded to your request',
    'A top expert responded to your request — read their pitch now.',
    '/inbox/' || _conv::text
  );

  RETURN _conv;
END $$;

GRANT EXECUTE ON FUNCTION public.notify_river_match(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_river_pitch(uuid, text) TO authenticated;
