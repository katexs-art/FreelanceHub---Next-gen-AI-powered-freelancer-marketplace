
-- ============ PROFILES (extends auth.users) ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client','expert','admin')),
  avatar_url TEXT,
  business_name TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_marketplace_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin')
$$;

CREATE POLICY "Profiles viewable by self" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles viewable by admin" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_marketplace_admin(auth.uid()));
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_marketplace_admin(auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, business_name, industry)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'industry'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ EXPERTS ============
CREATE TABLE public.experts (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT,
  specialty TEXT,
  years_experience TEXT,
  starting_price INTEGER DEFAULT 50,
  delivery_time TEXT,
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  portfolio_links TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  tier TEXT NOT NULL DEFAULT 'verified' CHECK (tier IN ('verified','certified','partner')),
  rating NUMERIC(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  repeat_rate INTEGER DEFAULT 0,
  response_time TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.experts TO anon, authenticated;
GRANT INSERT, UPDATE ON public.experts TO authenticated;
GRANT ALL ON public.experts TO service_role;
ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active experts public" ON public.experts
  FOR SELECT USING (status = 'active' OR auth.uid() = id OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "Experts insert own" ON public.experts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Experts update own" ON public.experts
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update any expert" ON public.experts
  FOR UPDATE TO authenticated USING (public.is_marketplace_admin(auth.uid()));

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  description TEXT,
  listing_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active categories public" ON public.categories
  FOR SELECT USING (is_active = true OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated USING (public.is_marketplace_admin(auth.uid()))
  WITH CHECK (public.is_marketplace_admin(auth.uid()));

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price INTEGER NOT NULL CHECK (price >= 50),
  delivery_days INTEGER DEFAULT 7,
  revisions INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active services public" ON public.services
  FOR SELECT USING (is_active = true OR auth.uid() = expert_id OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "Experts manage own services" ON public.services
  FOR ALL TO authenticated USING (auth.uid() = expert_id) WITH CHECK (auth.uid() = expert_id);
CREATE POLICY "Admins manage services" ON public.services
  FOR UPDATE TO authenticated USING (public.is_marketplace_admin(auth.uid()));

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  price INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  expert_payout INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','active','delivered','under_review','completed','disputed','cancelled')),
  delivery_deadline TIMESTAMPTZ,
  review_deadline TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project participants read" ON public.projects
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = expert_id OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "Clients create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Participants update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = expert_id OR public.is_marketplace_admin(auth.uid()));

-- ============ PROJECT MESSAGES (separate from existing internal `messages` table) ============
CREATE TABLE public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.project_messages TO authenticated;
GRANT ALL ON public.project_messages TO service_role;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_project_participant(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND (client_id = _user_id OR expert_id = _user_id)
  )
$$;

CREATE POLICY "Participants read messages" ON public.project_messages
  FOR SELECT TO authenticated
  USING (public.is_project_participant(project_id, auth.uid()) OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "Participants send messages" ON public.project_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_project_participant(project_id, auth.uid()));
CREATE POLICY "Participants update read state" ON public.project_messages
  FOR UPDATE TO authenticated
  USING (public.is_project_participant(project_id, auth.uid()));

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Clients create review for completed projects" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = client_id AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.client_id = auth.uid() AND p.status = 'completed'
    )
  );

-- ============ TRANSACTIONS ============
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  expert_payout INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transaction parties read" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = expert_id OR public.is_marketplace_admin(auth.uid()));

-- ============ RIVER SESSIONS ============
CREATE TABLE public.river_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  intent TEXT,
  matched_expert_ids UUID[] DEFAULT ARRAY[]::UUID[],
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.river_sessions TO anon, authenticated;
GRANT ALL ON public.river_sessions TO service_role;
ALTER TABLE public.river_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own river sessions" ON public.river_sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR public.is_marketplace_admin(auth.uid()));
CREATE POLICY "Anyone insert river session" ON public.river_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own river sessions" ON public.river_sessions
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- ============ TIMESTAMPS TRIGGERS ============
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
