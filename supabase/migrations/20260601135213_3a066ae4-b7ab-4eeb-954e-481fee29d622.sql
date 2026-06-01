-- Harden handle_new_user so signup never fails silently and leaves orphan auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE new_role public.user_role;
BEGIN
  new_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::public.user_role, 'client');
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, username, role, country, seller_status)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
      NULLIF(NEW.raw_user_meta_data->>'username',''), new_role, NEW.raw_user_meta_data->>'country',
      'approved')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: ensure a minimal profile row exists so FKs never fail
    INSERT INTO public.profiles (id, email, role, seller_status)
    VALUES (NEW.id, NEW.email, new_role, 'approved')
    ON CONFLICT (id) DO NOTHING;
  END;

  IF new_role = 'seller' THEN
    BEGIN
      INSERT INTO public.seller_accounts(seller_id) VALUES (NEW.id) ON CONFLICT (seller_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

-- Re-assert trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for any existing auth users
INSERT INTO public.profiles (id, email, full_name, username, role, country, seller_status)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  NULLIF(u.raw_user_meta_data->>'username',''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'role','')::public.user_role, 'client'),
  u.raw_user_meta_data->>'country',
  'approved'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;