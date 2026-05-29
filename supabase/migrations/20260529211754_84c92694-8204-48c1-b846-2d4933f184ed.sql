CREATE OR REPLACE FUNCTION public.submit_bid(_project_id uuid, _bid_amount integer, _delivery_days integer, _cover_message text, _attachments text[] DEFAULT ARRAY[]::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _buyer uuid;
  _bid_id uuid;
  _buyer_exists boolean;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT buyer_id INTO _buyer FROM public.project_posts WHERE id = _project_id;
  IF _buyer IS NULL THEN RAISE EXCEPTION 'project not found'; END IF;
  IF _buyer = _me THEN RAISE EXCEPTION 'cannot bid on own project'; END IF;

  INSERT INTO public.bids(project_id, seller_id, bid_amount, delivery_days, cover_message, attachments)
  VALUES (_project_id, _me, _bid_amount, _delivery_days, _cover_message, COALESCE(_attachments, ARRAY[]::text[]))
  RETURNING id INTO _bid_id;

  UPDATE public.project_posts SET bid_count = bid_count + 1 WHERE id = _project_id;

  -- Best-effort notification; never fail the bid if the notification can't be created
  BEGIN
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = _buyer) INTO _buyer_exists;
    IF _buyer_exists THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (
        _buyer, 'bid'::notification_type,
        'A new bid came in on your project',
        'A new bid came in on your project — review it now.',
        '/projects/' || _project_id::text || '/bids'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- swallow notification errors so the bid is preserved
    NULL;
  END;

  RETURN _bid_id;
END $function$;