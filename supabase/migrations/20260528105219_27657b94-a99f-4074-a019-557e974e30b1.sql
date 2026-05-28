
ALTER TABLE public.seller_accounts
  ADD COLUMN IF NOT EXISTS payout_method text CHECK (payout_method IN ('stripe_bank','paypal')),
  ADD COLUMN IF NOT EXISTS paypal_email text,
  ADD COLUMN IF NOT EXISTS bank_country text,
  ADD COLUMN IF NOT EXISTS bank_last4 text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_id text,
  ADD COLUMN IF NOT EXISTS stripe_charge_id text;

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS failure_reason text;
