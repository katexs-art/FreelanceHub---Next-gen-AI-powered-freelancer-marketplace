
-- Withdrawal request policy: seller may request, only against own account
CREATE POLICY wd_seller_insert ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Admin can update withdrawal status
CREATE POLICY wd_admin_update ON public.withdrawals FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Recompute seller balances from ledger
CREATE OR REPLACE FUNCTION public.recompute_seller_balance(_seller uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _cleared int;
  _pending int;
  _lifetime int;
  _withdrawn int;
BEGIN
  SELECT COALESCE(SUM(amount) FILTER (WHERE type='seller_credit' AND status='cleared'),0),
         COALESCE(SUM(amount) FILTER (WHERE type='seller_credit' AND status='pending'),0),
         COALESCE(SUM(amount) FILTER (WHERE type='seller_credit'),0)
    INTO _cleared, _pending, _lifetime
    FROM public.transactions WHERE seller_id = _seller;

  SELECT COALESCE(SUM(amount),0) INTO _withdrawn
    FROM public.withdrawals WHERE seller_id = _seller AND status IN ('requested','processing','paid');

  UPDATE public.seller_accounts
    SET available_balance = GREATEST(_cleared - _withdrawn, 0),
        pending_balance = _pending,
        lifetime_earnings = _lifetime,
        updated_at = now()
    WHERE seller_id = _seller;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recompute_from_transaction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP='DELETE') THEN PERFORM public.recompute_seller_balance(OLD.seller_id);
  ELSE PERFORM public.recompute_seller_balance(NEW.seller_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_tx_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_transaction();

CREATE OR REPLACE FUNCTION public.trg_recompute_from_withdrawal()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP='DELETE') THEN PERFORM public.recompute_seller_balance(OLD.seller_id);
  ELSE PERFORM public.recompute_seller_balance(NEW.seller_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_wd_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_from_withdrawal();

-- Auto-clear seller credits 14 days after creation (default for new rows)
CREATE OR REPLACE FUNCTION public.tx_set_clears_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.type='seller_credit' AND NEW.clears_at IS NULL THEN
    NEW.clears_at := NEW.created_at + interval '14 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tx_clears_at
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.tx_set_clears_at();

-- Helper: mark pending credits as cleared when their clears_at has passed
CREATE OR REPLACE FUNCTION public.clear_due_seller_credits()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.transactions SET status='cleared'
    WHERE type='seller_credit' AND status='pending' AND clears_at <= now();
$$;
