-- Auto-approve all new sellers on signup (no application required)
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
    'approved')
  ON CONFLICT (id) DO NOTHING;
  IF new_role = 'seller' THEN
    INSERT INTO public.seller_accounts(seller_id) VALUES (NEW.id) ON CONFLICT (seller_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Upgrade any existing sellers stuck in onboarding/pending to approved
UPDATE public.profiles
SET seller_status = 'approved'
WHERE role = 'seller' AND seller_status IN ('onboarding','pending_approval');
