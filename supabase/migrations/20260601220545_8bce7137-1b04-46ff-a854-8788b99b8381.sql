CREATE OR REPLACE FUNCTION public.accept_custom_offer(_offer_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _me uuid := auth.uid();
  _o public.custom_offers%rowtype;
  _order_id uuid;
  _price int;
  _fee int;
  _earn int;
begin
  if _me is null then raise exception 'unauthenticated'; end if;
  select * into _o from public.custom_offers where id = _offer_id;
  if not found then raise exception 'offer not found'; end if;
  if _o.buyer_id <> _me then raise exception 'forbidden'; end if;
  if _o.status <> 'pending' then raise exception 'offer not pending'; end if;

  if _o.order_id is not null then
    return _o.order_id;
  end if;

  -- custom_offers.price is stored in cents; orders.price is in dollars.
  _price := round(_o.price / 100.0);
  if _price <= 0 then raise exception 'invalid price'; end if;

  -- 5% platform fee (aligned with checkout UI and stripe-payment-intent edge function)
  _fee := round(_price * 0.05);
  _earn := _price - _fee;

  insert into public.orders(buyer_id, seller_id, gig_id, price, platform_fee, seller_earnings, status, requirements_submitted, escrow_status)
  values (_o.buyer_id, _o.seller_id, _o.gig_id, _price, _fee, _earn, 'pending_payment', false, 'none')
  returning id into _order_id;

  update public.custom_offers
    set status = 'pending_payment', order_id = _order_id
    where id = _offer_id;

  return _order_id;
end $function$;