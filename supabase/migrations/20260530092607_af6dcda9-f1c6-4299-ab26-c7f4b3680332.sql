
CREATE OR REPLACE FUNCTION public.notify_river_match(_query text, _seller_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _search_id uuid;
  _sid uuid;
  _status text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _query IS NULL OR length(trim(_query)) = 0 THEN RAISE EXCEPTION 'query required'; END IF;

  INSERT INTO public.buyer_searches(buyer_id, query) VALUES (_me, _query)
    RETURNING id INTO _search_id;

  IF _seller_ids IS NOT NULL THEN
    FOREACH _sid IN ARRAY _seller_ids LOOP
      IF _sid IS NULL OR _sid = _me THEN CONTINUE; END IF;
      SELECT seller_status INTO _status FROM public.profiles WHERE id = _sid;
      IF _status IS DISTINCT FROM 'approved' THEN CONTINUE; END IF;
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
END $function$;
