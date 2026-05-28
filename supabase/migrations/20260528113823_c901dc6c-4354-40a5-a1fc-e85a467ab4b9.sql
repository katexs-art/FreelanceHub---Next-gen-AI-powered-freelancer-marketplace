-- Disputes additions
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS resolution_outcome text,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Profile suspension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- Extend enums (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='transaction_type' AND e.enumlabel='promotion_charge') THEN
    ALTER TYPE transaction_type ADD VALUE 'promotion_charge';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='notification_type' AND e.enumlabel='system') THEN
    ALTER TYPE notification_type ADD VALUE 'system';
  END IF;
END $$;

-- seller_follows
CREATE TABLE IF NOT EXISTS public.seller_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, seller_id)
);
GRANT SELECT, INSERT, DELETE ON public.seller_follows TO authenticated;
GRANT ALL ON public.seller_follows TO service_role;
ALTER TABLE public.seller_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_public_read" ON public.seller_follows FOR SELECT USING (true);
CREATE POLICY "follows_own_insert" ON public.seller_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_own_delete" ON public.seller_follows FOR DELETE USING (auth.uid() = follower_id);

-- gig_promotions
CREATE TABLE IF NOT EXISTS public.gig_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  daily_budget_cents int NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  impressions int NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  spend_cents int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gig_promotions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.gig_promotions TO authenticated;
GRANT ALL ON public.gig_promotions TO service_role;
ALTER TABLE public.gig_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_public_read_active" ON public.gig_promotions FOR SELECT USING (status='active' AND ends_at > now());
CREATE POLICY "promo_seller_read_all" ON public.gig_promotions FOR SELECT USING (auth.uid() = seller_id OR public.is_admin(auth.uid()));
CREATE POLICY "promo_seller_insert" ON public.gig_promotions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "promo_seller_update" ON public.gig_promotions FOR UPDATE USING (auth.uid() = seller_id OR public.is_admin(auth.uid()));

-- seller_verifications
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unverified',
  id_document_url text,
  selfie_url text,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_verifications TO anon, authenticated;
GRANT INSERT, UPDATE ON public.seller_verifications TO authenticated;
GRANT ALL ON public.seller_verifications TO service_role;
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;
-- Public can read only status (we read whole row but only status is sensitive-safe); restrict doc URLs via column-less policy: keep simple, allow read of status fields by exposing only via dedicated function. For simplicity, allow public read of whole row except docs are private files in private bucket.
CREATE POLICY "verif_public_read_status" ON public.seller_verifications FOR SELECT USING (true);
CREATE POLICY "verif_seller_insert" ON public.seller_verifications FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "verif_seller_update" ON public.seller_verifications FOR UPDATE USING (auth.uid() = seller_id OR public.is_admin(auth.uid()));

-- reports
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_own_read" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));
CREATE POLICY "reports_own_insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_admin_update" ON public.reports FOR UPDATE USING (public.is_admin(auth.uid()));

-- Functions
CREATE OR REPLACE FUNCTION public.track_promotion_event(_promotion_id uuid, _event text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.gig_promotions
    SET impressions = impressions + CASE WHEN _event='impression' THEN 1 ELSE 0 END,
        clicks = clicks + CASE WHEN _event='click' THEN 1 ELSE 0 END
    WHERE id = _promotion_id AND status='active';
$$;

CREATE OR REPLACE FUNCTION public.seller_follower_count(_seller uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COUNT(*)::int FROM public.seller_follows WHERE seller_id = _seller;
$$;

CREATE OR REPLACE FUNCTION public.suspend_seller(_seller uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET suspended_at = now() WHERE id = _seller;
  UPDATE public.gigs SET status = 'paused' WHERE seller_id = _seller AND status = 'active';
END $$;

-- Followers notification on new active gig
CREATE OR REPLACE FUNCTION public.notify_followers_on_new_gig()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _name text;
BEGIN
  IF NEW.status = 'active' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT COALESCE(full_name, username, 'A seller') INTO _name FROM public.profiles WHERE id = NEW.seller_id;
    INSERT INTO public.notifications(user_id, type, title, body, link)
      SELECT f.follower_id, 'system'::notification_type, _name || ' published a new gig', NEW.title, '/gig/' || NEW.id::text
      FROM public.seller_follows f WHERE f.seller_id = NEW.seller_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS gigs_notify_followers ON public.gigs;
CREATE TRIGGER gigs_notify_followers AFTER INSERT OR UPDATE OF status ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_new_gig();

-- Extend gigs_public_read to exclude suspended sellers
DROP POLICY IF EXISTS gigs_public_read ON public.gigs;
CREATE POLICY gigs_public_read ON public.gigs FOR SELECT USING (
  ((status = 'active'::gig_status AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = gigs.seller_id AND p.suspended_at IS NOT NULL))
    OR auth.uid() = seller_id OR public.is_admin(auth.uid()))
);

-- KYC bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "kyc_owner_read" ON storage.objects FOR SELECT
  USING (bucket_id='kyc-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));
CREATE POLICY "kyc_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id='kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
