
CREATE OR REPLACE FUNCTION public.create_gig_order(_package_id uuid, _extra_ids uuid[] DEFAULT ARRAY[]::uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _pkg record;
  _gig record;
  _extras_total int := 0;
  _extra_days int := 0;
  _price int;
  _days int;
  _fee int;
  _earn int;
  _order_id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT id, price, delivery_days, gig_id, package_type
    INTO _pkg FROM public.gig_packages WHERE id = _package_id;
  IF _pkg IS NULL THEN RAISE EXCEPTION 'package not found'; END IF;

  SELECT id, seller_id, status, title
    INTO _gig FROM public.gigs WHERE id = _pkg.gig_id;
  IF _gig IS NULL THEN RAISE EXCEPTION 'gig not found'; END IF;
  IF _gig.status <> 'active' THEN RAISE EXCEPTION 'gig is not active'; END IF;
  IF _gig.seller_id = _me THEN RAISE EXCEPTION 'cannot purchase your own gig'; END IF;

  IF _extra_ids IS NOT NULL AND array_length(_extra_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0), COALESCE(SUM(extra_delivery_days), 0)
      INTO _extras_total, _extra_days
      FROM public.gig_extras
      WHERE id = ANY(_extra_ids) AND gig_id = _gig.id;
  END IF;

  _price := _pkg.price + _extras_total;
  _days := _pkg.delivery_days + _extra_days;
  _fee := ROUND(_price * 0.10);
  _earn := _price - _fee;

  INSERT INTO public.orders(
    buyer_id, seller_id, gig_id, package_id, selected_extra_ids,
    price, platform_fee, seller_earnings,
    status, escrow_status, requirements_submitted,
    project_title, delivery_deadline
  ) VALUES (
    _me, _gig.seller_id, _gig.id, _pkg.id, COALESCE(_extra_ids, ARRAY[]::uuid[]),
    _price, _fee, _earn,
    'pending_payment'::order_status, 'none', false,
    _gig.title, now() + (_days || ' days')::interval
  ) RETURNING id INTO _order_id;

  RETURN _order_id;
END $$;

REVOKE ALL ON FUNCTION public.create_gig_order(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_gig_order(uuid, uuid[]) TO authenticated;
