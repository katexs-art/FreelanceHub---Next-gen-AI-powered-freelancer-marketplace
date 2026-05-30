-- 1. Fix custom offer fee (was 20%, should be 10% to match webhook + create_escrow_order)
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

  _fee := round(_o.price * 0.10);
  _earn := _o.price - _fee;

  insert into public.orders(buyer_id, seller_id, gig_id, price, platform_fee, seller_earnings, status, requirements_submitted)
  values (_o.buyer_id, _o.seller_id, _o.gig_id, _o.price, _fee, _earn, 'pending_requirements', false)
  returning id into _order_id;

  update public.custom_offers set status='accepted' where id = _offer_id;
  return _order_id;
end $function$;

-- 2. Restrict profiles_public_read to non-PII columns for anon/non-owners.
-- Strategy: replace the wide-open policy with two policies:
--   (a) owner/admin full read
--   (b) public read limited via a column-level grant pattern using a SECURITY DEFINER view is complex;
--   simplest correct fix: revoke select on PII columns from anon/authenticated, keep row policy permissive.
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

CREATE POLICY profiles_owner_admin_read ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_admin(auth.uid()));

CREATE POLICY profiles_public_marketplace_read ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- Lock down PII at column level
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, full_name, username, avatar_url, role, bio, languages,
  member_since, is_online, last_seen, response_time_minutes, response_rate,
  river_score, average_rating, total_reviews, seller_status,
  seller_skills, primary_category, secondary_category, portfolio_urls,
  location, suspended_at, created_at, updated_at
) ON public.profiles TO anon, authenticated;
-- Owner/admin still need email, rejection_reason, pending_packages, application_submitted_at, country
-- via SECURITY DEFINER helper:
CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS public.profiles
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT * FROM public.profiles WHERE id = auth.uid() $$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 3. Webhook idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id text PRIMARY KEY,
  source text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY we_admin_read ON public.webhook_events FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 4. Rate limits table for public AI endpoints
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  identifier text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1,
  UNIQUE (bucket, identifier, window_start)
);
CREATE INDEX IF NOT EXISTS rl_bucket_id_idx ON public.rate_limits (bucket, identifier, window_start DESC);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- service_role only; no policies needed for authenticated/anon.

-- 5. Hot-path indexes
CREATE INDEX IF NOT EXISTS orders_buyer_status_idx ON public.orders (buyer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_status_idx ON public.orders (seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_auto_complete_idx ON public.orders (auto_complete_at) WHERE status IN ('delivered','disputed');
CREATE INDEX IF NOT EXISTS gigs_seller_status_idx ON public.gigs (seller_id, status);
CREATE INDEX IF NOT EXISTS gigs_status_category_idx ON public.gigs (status, category) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_seller_type_status_idx ON public.transactions (seller_id, type, status);
CREATE INDEX IF NOT EXISTS bids_project_status_idx ON public.bids (project_id, status);
