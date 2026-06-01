-- Add pending_payment to offer_status
ALTER TYPE public.offer_status ADD VALUE IF NOT EXISTS 'pending_payment' BEFORE 'accepted';

-- Add order link on custom_offers
ALTER TABLE public.custom_offers
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custom_offers_order_id ON public.custom_offers(order_id);

-- Rewrite RPC: create pending_payment order, mark offer pending_payment
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
  _fee int;
  _earn int;
begin
  if _me is null then raise exception 'unauthenticated'; end if;
  select * into _o from public.custom_offers where id = _offer_id;
  if not found then raise exception 'offer not found'; end if;
  if _o.buyer_id <> _me then raise exception 'forbidden'; end if;
  if _o.status <> 'pending' then raise exception 'offer not pending'; end if;

  -- Reuse existing pending_payment order if present
  if _o.order_id is not null then
    return _o.order_id;
  end if;

  _fee := round(_o.price * 0.10);
  _earn := _o.price - _fee;

  insert into public.orders(buyer_id, seller_id, gig_id, price, platform_fee, seller_earnings, status, requirements_submitted, escrow_status)
  values (_o.buyer_id, _o.seller_id, _o.gig_id, _o.price, _fee, _earn, 'pending_payment', false, 'none')
  returning id into _order_id;

  update public.custom_offers
    set status = 'pending_payment', order_id = _order_id
    where id = _offer_id;

  return _order_id;
end $function$;