
-- 1. seller_applications table
CREATE TABLE public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  full_name text not null,
  avatar_url text,
  bio text not null,
  location text not null,
  language text not null,
  skills text[] not null default '{}',
  primary_category text not null,
  secondary_category text,
  experience_description text not null,
  packages jsonb not null default '[]'::jsonb,
  portfolio_urls text[] not null default '{}',
  status text not null default 'pending',
  admin_notes text,
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT ON public.seller_applications TO authenticated;
GRANT ALL ON public.seller_applications TO service_role;

ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY sa_own_read ON public.seller_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_id OR public.is_admin(auth.uid()));

CREATE POLICY sa_own_insert ON public.seller_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY sa_admin_update ON public.seller_applications
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_seller_applications_status_created ON public.seller_applications(status, created_at);
CREATE INDEX idx_seller_applications_seller ON public.seller_applications(seller_id);

-- 2. Updated submit_seller_application: also inserts into seller_applications, adds experience + language
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
  _portfolio_urls text[],
  _experience_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _admin_id uuid;
  _name text;
  _app_id uuid;
  _lang text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _skills IS NULL OR array_length(_skills,1) IS NULL OR array_length(_skills,1) < 3 THEN
    RAISE EXCEPTION 'at least 3 skills required';
  END IF;
  IF _primary_category IS NULL OR length(trim(_primary_category)) = 0 THEN
    RAISE EXCEPTION 'primary category required';
  END IF;
  IF _experience_description IS NULL OR length(trim(_experience_description)) < 80 THEN
    RAISE EXCEPTION 'experience description must be at least 80 characters';
  END IF;

  _lang := COALESCE(_languages[1], '');

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

  INSERT INTO public.seller_applications(
    seller_id, full_name, avatar_url, bio, location, language,
    skills, primary_category, secondary_category, experience_description,
    packages, portfolio_urls, status
  ) VALUES (
    _me, _full_name, NULLIF(trim(COALESCE(_avatar_url,'')),''), _bio, _location, _lang,
    _skills, _primary_category, NULLIF(trim(COALESCE(_secondary_category,'')),''), _experience_description,
    COALESCE(_packages, '[]'::jsonb), COALESCE(_portfolio_urls, ARRAY[]::text[]), 'pending'
  ) RETURNING id INTO _app_id;

  SELECT COALESCE(full_name, username, 'A new seller') INTO _name FROM public.profiles WHERE id = _me;

  FOR _admin_id IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    PERFORM public.create_notification(
      _admin_id, 'system'::notification_type,
      'New seller application submitted — review now.',
      _name,
      '/admin/seller-applications'
    );
  END LOOP;

  RETURN _app_id;
END $function$;

-- 3. Updated approve_seller: also marks application reviewed
CREATE OR REPLACE FUNCTION public.approve_seller(_seller uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
    SET seller_status = 'approved', rejection_reason = NULL, updated_at = now()
    WHERE id = _seller;

  UPDATE public.seller_applications
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE seller_id = _seller AND status = 'pending';

  PERFORM public.create_notification(
    _seller, 'system'::notification_type,
    'Congratulations — you are approved to sell on Katexs. Start building your profile and getting matched to buyers today.',
    NULL,
    '/seller/dashboard'
  );
END $function$;

-- 4. Updated reject_seller
CREATE OR REPLACE FUNCTION public.reject_seller(_seller uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
    SET seller_status = 'rejected', rejection_reason = COALESCE(_reason,'No reason provided'), updated_at = now()
    WHERE id = _seller;

  UPDATE public.seller_applications
    SET status = 'rejected', rejection_reason = COALESCE(_reason,'No reason provided'),
        reviewed_by = auth.uid(), reviewed_at = now()
    WHERE seller_id = _seller AND status = 'pending';

  PERFORM public.create_notification(
    _seller, 'system'::notification_type,
    'Your Katexs seller application was not approved.',
    COALESCE(_reason,'No reason provided'),
    '/seller-onboarding'
  );
END $function$;
