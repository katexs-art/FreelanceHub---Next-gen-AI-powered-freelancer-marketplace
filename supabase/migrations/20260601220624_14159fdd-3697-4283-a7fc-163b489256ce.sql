ALTER TABLE public.orders DISABLE TRIGGER orders_guard_sensitive_updates_t;

UPDATE public.orders o
SET price            = ROUND(c.price / 100.0)::int,
    platform_fee     = ROUND(ROUND(c.price / 100.0)::int * 0.05)::int,
    seller_earnings  = ROUND(c.price / 100.0)::int - ROUND(ROUND(c.price / 100.0)::int * 0.05)::int,
    updated_at       = now()
FROM public.custom_offers c
WHERE c.order_id = o.id
  AND o.price = c.price
  AND c.price >= 100
  AND o.status = 'pending_payment';

ALTER TABLE public.orders ENABLE TRIGGER orders_guard_sensitive_updates_t;