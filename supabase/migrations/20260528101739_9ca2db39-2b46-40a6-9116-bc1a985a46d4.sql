
create or replace function public.accept_custom_offer(_offer_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  _me uuid := auth.uid();
  _o public.custom_offers%rowtype;
  _order_id uuid;
  _fee int;
  _earn int;
begin
  if _me is null then raise exception 'unauthenticated'; end if;
  select * into _o from public.custom_offers where id = _offer_id;
  if not found then raise exception 'offer not found'; end if;
  if _o.buyer_id <> _me then raise exception 'forbidden'; end if;
  if _o.status <> 'pending' then raise exception 'offer not pending'; end if;

  _fee := round(_o.price * 0.20);
  _earn := _o.price - _fee;

  insert into public.orders(buyer_id, seller_id, gig_id, price, platform_fee, seller_earnings, status, requirements_submitted)
  values (_o.buyer_id, _o.seller_id, _o.gig_id, _o.price, _fee, _earn, 'pending_requirements', false)
  returning id into _order_id;

  update public.custom_offers set status='accepted' where id = _offer_id;
  return _order_id;
end $$;

revoke execute on function public.accept_custom_offer(uuid) from public, anon;
grant execute on function public.accept_custom_offer(uuid) to authenticated;
