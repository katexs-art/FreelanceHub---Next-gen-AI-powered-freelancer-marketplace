
-- 1. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS seller_skills text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS primary_category text,
  ADD COLUMN IF NOT EXISTS secondary_category text,
  ADD COLUMN IF NOT EXISTS portfolio_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS pending_packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS application_submitted_at timestamptz;

-- 2. Update handle_new_user so seller signups start at 'onboarding'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_role public.user_role;
BEGIN
  new_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::public.user_role, 'client');
  INSERT INTO public.profiles (id, email, full_name, username, role, country, seller_status)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
    NULLIF(NEW.raw_user_meta_data->>'username',''), new_role, NEW.raw_user_meta_data->>'country',
    CASE WHEN new_role = 'seller' THEN 'onboarding' ELSE 'approved' END)
  ON CONFLICT (id) DO NOTHING;
  IF new_role = 'seller' THEN
    INSERT INTO public.seller_accounts(seller_id) VALUES (NEW.id) ON CONFLICT (seller_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Tighten gigs insert to require approved sellers
DROP POLICY IF EXISTS gigs_seller_insert ON public.gigs;
CREATE POLICY gigs_seller_insert ON public.gigs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.seller_status = 'approved' OR public.is_admin(auth.uid()))
    )
  );

-- 4. Portfolio bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-portfolio', 'seller-portfolio', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "portfolio_public_read" ON storage.objects FOR SELECT
    USING (bucket_id = 'seller-portfolio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "portfolio_owner_write" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'seller-portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "portfolio_owner_update" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'seller-portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "portfolio_owner_delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'seller-portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Submit seller application RPC
CREATE OR REPLACE FUNCTION public.submit_seller_application(
  _full_name text,
  _avatar_url text,
  _bio text,
  _location text,
  _languages text[],
  _skills text[],
  _primary_category text,
  _secondary_category text,
  _packages jsonb,
  _portfolio_urls text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _admin_id uuid;
  _name text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _skills IS NULL OR array_length(_skills,1) IS NULL OR array_length(_skills,1) < 3 THEN
    RAISE EXCEPTION 'at least 3 skills required';
  END IF;
  IF _primary_category IS NULL OR length(trim(_primary_category)) = 0 THEN
    RAISE EXCEPTION 'primary category required';
  END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(NULLIF(trim(_full_name),''), full_name),
    avatar_url = COALESCE(NULLIF(trim(_avatar_url),''), avatar_url),
    bio = COALESCE(NULLIF(trim(_bio),''), bio),
    location = COALESCE(NULLIF(trim(_location),''), location),
    languages = COALESCE(_languages, languages),
    seller_skills = _skills,
    primary_category = _primary_category,
    secondary_category = NULLIF(trim(COALESCE(_secondary_category,'')),''),
    pending_packages = COALESCE(_packages, '[]'::jsonb),
    portfolio_urls = COALESCE(_portfolio_urls, ARRAY[]::text[]),
    seller_status = 'pending_approval',
    application_submitted_at = now(),
    updated_at = now()
  WHERE id = _me;

  SELECT COALESCE(full_name, username, 'A new seller') INTO _name FROM public.profiles WHERE id = _me;

  FOR _admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    PERFORM public.create_notification(
      _admin_id, 'system'::notification_type,
      'New seller application received — review now.',
      _name,
      '/admin?tab=seller_approvals'
    );
  END LOOP;
END $$;

-- 6. Approve / reject RPCs
CREATE OR REPLACE FUNCTION public.approve_seller(_seller uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
    SET seller_status = 'approved', rejection_reason = NULL, updated_at = now()
    WHERE id = _seller;

  PERFORM public.create_notification(
    _seller, 'system'::notification_type,
    'Congratulations — you are approved to sell on Katexs. Complete your profile and start getting matched to buyers today.',
    NULL,
    '/seller/dashboard'
  );
END $$;

CREATE OR REPLACE FUNCTION public.reject_seller(_seller uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
    SET seller_status = 'rejected', rejection_reason = COALESCE(_reason,'No reason provided'), updated_at = now()
    WHERE id = _seller;

  PERFORM public.create_notification(
    _seller, 'system'::notification_type,
    'Your seller application was not approved',
    COALESCE(_reason,'No reason provided'),
    '/seller-onboarding'
  );
END $$;
