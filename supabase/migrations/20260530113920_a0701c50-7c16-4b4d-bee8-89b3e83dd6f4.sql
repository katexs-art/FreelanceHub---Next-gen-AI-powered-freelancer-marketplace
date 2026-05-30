-- Dispute-aware auto-release for escrow
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_hold_notified_at timestamptz;

-- Allow admins to update transactions (for releasing seller credit on dispute resolution)
DROP POLICY IF EXISTS tx_admin_update ON public.transactions;
CREATE POLICY tx_admin_update ON public.transactions
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

GRANT UPDATE ON public.transactions TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_complete_orders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _disputed uuid[];
  _clean uuid[];
BEGIN
  -- All orders due for auto-release
  WITH candidates AS (
    SELECT o.id,
           (o.status = 'disputed'
            OR EXISTS (SELECT 1 FROM public.disputes d
                        WHERE d.order_id = o.id AND d.status = 'open')) AS is_disputed
      FROM public.orders o
     WHERE o.status IN ('delivered','disputed')
       AND o.auto_complete_at IS NOT NULL
       AND o.auto_complete_at <= now()
       AND o.escrow_status = 'held'
  )
  SELECT
    array_agg(id) FILTER (WHERE is_disputed),
    array_agg(id) FILTER (WHERE NOT is_disputed)
  INTO _disputed, _clean
  FROM candidates;

  -- DISPUTED: never release. Notify both parties once.
  IF _disputed IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT o.seller_id, 'system', 'Payout paused',
           'Your payout has been paused due to an open dispute on this order. Our team is reviewing and will resolve within 24 hours.',
           '/orders/' || o.id::text
      FROM public.orders o
     WHERE o.id = ANY(_disputed) AND o.dispute_hold_notified_at IS NULL;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT o.buyer_id, 'system', 'Dispute under review',
           'Your dispute is being reviewed. Funds are held securely until resolution.',
           '/orders/' || o.id::text
      FROM public.orders o
     WHERE o.id = ANY(_disputed) AND o.dispute_hold_notified_at IS NULL;

    UPDATE public.orders
       SET dispute_hold_notified_at = now()
     WHERE id = ANY(_disputed) AND dispute_hold_notified_at IS NULL;
  END IF;

  -- CLEAN: release normally
  IF _clean IS NOT NULL THEN
    UPDATE public.orders
       SET status = 'completed',
           completed_at = now(),
           escrow_status = 'released',
           escrow_released_at = now(),
           updated_at = now()
     WHERE id = ANY(_clean);

    UPDATE public.transactions
       SET status = 'cleared', clears_at = now()
     WHERE order_id = ANY(_clean) AND type = 'seller_credit' AND status = 'pending';
  END IF;
END $$;