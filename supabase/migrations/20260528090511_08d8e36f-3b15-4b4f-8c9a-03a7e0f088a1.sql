DROP TABLE IF EXISTS public.admin_activity_logs CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.affiliate_clicks CASCADE;
DROP TABLE IF EXISTS public.affiliate_payouts CASCADE;
DROP TABLE IF EXISTS public.affiliates CASCADE;
DROP TABLE IF EXISTS public.ai_studio_sessions CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.channel_members CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.error_logs CASCADE;
DROP TABLE IF EXISTS public.integration_settings CASCADE;
DROP TABLE IF EXISTS public.message_files CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.messenger_messages CASCADE;
DROP TABLE IF EXISTS public.notification_settings CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.team_invites CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.vapi_analytics CASCADE;
DROP TABLE IF EXISTS public.vapi_assistants CASCADE;
DROP TABLE IF EXISTS public.vapi_calls CASCADE;
DROP TABLE IF EXISTS public.vapi_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.river_sessions CASCADE;
DROP TABLE IF EXISTS public.project_messages CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.experts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.user_plan CASCADE;
DROP TYPE IF EXISTS public.contact_status CASCADE;
DROP TYPE IF EXISTS public.deal_stage CASCADE;
DROP TYPE IF EXISTS public.message_channel CASCADE;
DROP TYPE IF EXISTS public.payout_status CASCADE;
DROP TYPE IF EXISTS public.admin_role CASCADE;
DROP TYPE IF EXISTS public.activity_type CASCADE;

DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_marketplace_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_project_participant(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE TYPE public.user_role AS ENUM ('client','seller','admin');
CREATE TYPE public.gig_status AS ENUM ('draft','pending_review','active','paused','denied');
CREATE TYPE public.order_status AS ENUM ('pending_payment','pending_requirements','active','delivered','revision_requested','completed','cancelled','disputed');
CREATE TYPE public.package_type AS ENUM ('basic','standard','premium');
CREATE TYPE public.transaction_type AS ENUM ('charge','platform_fee','seller_credit','refund','withdrawal');
CREATE TYPE public.transaction_status AS ENUM ('pending','cleared','reversed');
CREATE TYPE public.withdrawal_status AS ENUM ('requested','processing','paid','failed');
CREATE TYPE public.dispute_status AS ENUM ('open','under_review','resolved_refund','resolved_release','resolved_partial');
CREATE TYPE public.cancellation_status AS ENUM ('pending','accepted','declined');
CREATE TYPE public.offer_status AS ENUM ('pending','accepted','declined','withdrawn','expired');
CREATE TYPE public.notification_type AS ENUM ('order_placed','requirements_submitted','order_delivered','order_completed','revision_requested','review_received','custom_offer','message','dispute','payout');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  username text UNIQUE,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'client',
  bio text,
  country text,
  languages text[] DEFAULT ARRAY[]::text[],
  member_since timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz,
  response_time_minutes integer,
  response_rate decimal,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin') $$;

CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE TABLE public.seller_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  available_balance integer NOT NULL DEFAULT 0,
  pending_balance integer NOT NULL DEFAULT 0,
  lifetime_earnings integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.seller_accounts TO authenticated;
GRANT ALL ON public.seller_accounts TO service_role;
ALTER TABLE public.seller_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller_acc_own_read" ON public.seller_accounts FOR SELECT USING (auth.uid() = seller_id OR public.is_admin(auth.uid()));
CREATE POLICY "seller_acc_own_update" ON public.seller_accounts FOR UPDATE USING (auth.uid() = seller_id);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_public_read" ON public.categories FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "cat_admin_manage" ON public.categories FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  subcategory text,
  tags text[] DEFAULT ARRAY[]::text[],
  thumbnail_url text,
  gallery_urls text[] DEFAULT ARRAY[]::text[],
  starting_price integer NOT NULL,
  status public.gig_status NOT NULL DEFAULT 'draft',
  total_orders integer NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  average_rating decimal NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gigs_search_idx ON public.gigs USING GIN(search_vector);
CREATE INDEX gigs_cat_status_idx ON public.gigs(category, status);

CREATE OR REPLACE FUNCTION public.gigs_set_search_vector()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags,' '),'')), 'C');
  RETURN NEW;
END;
$$;
CREATE TRIGGER gigs_search_vector_trg BEFORE INSERT OR UPDATE OF title, description, tags
  ON public.gigs FOR EACH ROW EXECUTE FUNCTION public.gigs_set_search_vector();

GRANT SELECT ON public.gigs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gigs TO authenticated;
GRANT ALL ON public.gigs TO service_role;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gigs_public_read" ON public.gigs FOR SELECT USING (status='active' OR auth.uid()=seller_id OR public.is_admin(auth.uid()));
CREATE POLICY "gigs_seller_insert" ON public.gigs FOR INSERT WITH CHECK (auth.uid()=seller_id);
CREATE POLICY "gigs_seller_update" ON public.gigs FOR UPDATE USING (auth.uid()=seller_id OR public.is_admin(auth.uid()));
CREATE POLICY "gigs_seller_delete" ON public.gigs FOR DELETE USING (auth.uid()=seller_id);

CREATE TABLE public.gig_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  package_type public.package_type NOT NULL,
  title text, description text, price integer NOT NULL,
  delivery_days integer NOT NULL DEFAULT 7,
  revisions integer NOT NULL DEFAULT 1,
  features text[] DEFAULT ARRAY[]::text[],
  UNIQUE(gig_id, package_type)
);
GRANT SELECT ON public.gig_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gig_packages TO authenticated;
GRANT ALL ON public.gig_packages TO service_role;
ALTER TABLE public.gig_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pkg_public_read" ON public.gig_packages FOR SELECT USING (true);
CREATE POLICY "pkg_seller_manage" ON public.gig_packages FOR ALL
  USING (EXISTS(SELECT 1 FROM public.gigs g WHERE g.id=gig_id AND g.seller_id=auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.gigs g WHERE g.id=gig_id AND g.seller_id=auth.uid()));

CREATE TABLE public.gig_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  title text NOT NULL, price integer NOT NULL,
  extra_delivery_days integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.gig_extras TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gig_extras TO authenticated;
GRANT ALL ON public.gig_extras TO service_role;
ALTER TABLE public.gig_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "extras_public_read" ON public.gig_extras FOR SELECT USING (true);
CREATE POLICY "extras_seller_manage" ON public.gig_extras FOR ALL
  USING (EXISTS(SELECT 1 FROM public.gigs g WHERE g.id=gig_id AND g.seller_id=auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.gigs g WHERE g.id=gig_id AND g.seller_id=auth.uid()));

CREATE TABLE public.gig_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  question text NOT NULL, field_type text NOT NULL DEFAULT 'text',
  options text[] DEFAULT ARRAY[]::text[],
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0
);
GRANT SELECT ON public.gig_requirements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gig_requirements TO authenticated;
GRANT ALL ON public.gig_requirements TO service_role;
ALTER TABLE public.gig_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_public_read" ON public.gig_requirements FOR SELECT USING (true);
CREATE POLICY "req_seller_manage" ON public.gig_requirements FOR ALL
  USING (EXISTS(SELECT 1 FROM public.gigs g WHERE g.id=gig_id AND g.seller_id=auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.gigs g WHERE g.id=gig_id AND g.seller_id=auth.uid()));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL DEFAULT ('KX-' || upper(substr(md5(gen_random_uuid()::text), 1, 5))),
  gig_id uuid NOT NULL REFERENCES public.gigs(id),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  package_id uuid REFERENCES public.gig_packages(id),
  selected_extra_ids uuid[] DEFAULT ARRAY[]::uuid[],
  requirements_submitted boolean NOT NULL DEFAULT false,
  requirements_submitted_at timestamptz,
  price integer NOT NULL, platform_fee integer NOT NULL, seller_earnings integer NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  delivery_deadline timestamptz, auto_complete_at timestamptz,
  delivered_at timestamptz, completed_at timestamptz,
  revision_count integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_order_party(_order_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM public.orders WHERE id=_order_id AND (buyer_id=_user_id OR seller_id=_user_id)) $$;

CREATE POLICY "orders_party_read" ON public.orders FOR SELECT
  USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR public.is_admin(auth.uid()));

CREATE TABLE public.order_requirements_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.gig_requirements(id),
  answer text, file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_requirements_answers TO authenticated;
GRANT ALL ON public.order_requirements_answers TO service_role;
ALTER TABLE public.order_requirements_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_ans_party_read" ON public.order_requirements_answers FOR SELECT USING (public.is_order_party(order_id, auth.uid()));
CREATE POLICY "req_ans_buyer_write" ON public.order_requirements_answers FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.buyer_id=auth.uid()));

CREATE TABLE public.order_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  message text, file_urls text[] DEFAULT ARRAY[]::text[],
  delivered_by uuid NOT NULL REFERENCES public.profiles(id),
  is_revision boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_deliveries TO authenticated;
GRANT ALL ON public.order_deliveries TO service_role;
ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliv_party_read" ON public.order_deliveries FOR SELECT USING (public.is_order_party(order_id, auth.uid()));
CREATE POLICY "deliv_seller_insert" ON public.order_deliveries FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.seller_id=auth.uid()) AND delivered_by = auth.uid());

CREATE TABLE public.custom_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  gig_id uuid REFERENCES public.gigs(id),
  description text, price integer NOT NULL,
  delivery_days integer NOT NULL, revisions integer NOT NULL DEFAULT 1,
  status public.offer_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.custom_offers TO authenticated;
GRANT ALL ON public.custom_offers TO service_role;
ALTER TABLE public.custom_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_party_read" ON public.custom_offers FOR SELECT USING (auth.uid()=buyer_id OR auth.uid()=seller_id);
CREATE POLICY "offers_seller_insert" ON public.custom_offers FOR INSERT WITH CHECK (auth.uid()=seller_id);
CREATE POLICY "offers_party_update" ON public.custom_offers FOR UPDATE USING (auth.uid()=buyer_id OR auth.uid()=seller_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id),
  content text, attachment_url text,
  custom_offer_id uuid REFERENCES public.custom_offers(id),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_party_read" ON public.messages FOR SELECT USING (auth.uid()=sender_id OR auth.uid()=recipient_id);
CREATE POLICY "msg_send" ON public.messages FOR INSERT WITH CHECK (auth.uid()=sender_id);
CREATE POLICY "msg_mark_read" ON public.messages FOR UPDATE USING (auth.uid()=recipient_id);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  gig_id uuid NOT NULL REFERENCES public.gigs(id),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  reviewer_role text NOT NULL CHECK (reviewer_role IN ('buyer','seller')),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  communication_rating integer, service_rating integer, recommend_rating integer,
  review_text text, reply text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, reviewer_role)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rev_public_read" ON public.reviews FOR SELECT USING (is_public);
CREATE POLICY "rev_party_read" ON public.reviews FOR SELECT USING (auth.uid()=buyer_id OR auth.uid()=seller_id OR public.is_admin(auth.uid()));
CREATE POLICY "rev_reviewer_insert" ON public.reviews FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.status='completed'
    AND ((reviewer_role='buyer' AND o.buyer_id=auth.uid())
      OR (reviewer_role='seller' AND o.seller_id=auth.uid()))));
CREATE POLICY "rev_counterpart_reply" ON public.reviews FOR UPDATE
  USING ((reviewer_role='buyer' AND auth.uid()=seller_id) OR (reviewer_role='seller' AND auth.uid()=buyer_id));

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text, description text,
  status public.dispute_status NOT NULL DEFAULT 'open',
  resolution_note text, resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disp_party_read" ON public.disputes FOR SELECT USING (public.is_order_party(order_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "disp_party_insert" ON public.disputes FOR INSERT WITH CHECK (public.is_order_party(order_id, auth.uid()) AND raised_by=auth.uid());
CREATE POLICY "disp_admin_update" ON public.disputes FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE TABLE public.cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text,
  status public.cancellation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cancellation_requests TO authenticated;
GRANT ALL ON public.cancellation_requests TO service_role;
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canc_party_read" ON public.cancellation_requests FOR SELECT USING (public.is_order_party(order_id, auth.uid()));
CREATE POLICY "canc_party_insert" ON public.cancellation_requests FOR INSERT WITH CHECK (public.is_order_party(order_id, auth.uid()) AND requested_by=auth.uid());
CREATE POLICY "canc_party_update" ON public.cancellation_requests FOR UPDATE USING (public.is_order_party(order_id, auth.uid()));

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  seller_id uuid REFERENCES public.profiles(id),
  type public.transaction_type NOT NULL, amount integer NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  clears_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_seller_read" ON public.transactions FOR SELECT USING (auth.uid()=seller_id OR public.is_admin(auth.uid()));

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  amount integer NOT NULL, stripe_payout_id text,
  status public.withdrawal_status NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_seller_read" ON public.withdrawals FOR SELECT USING (auth.uid()=seller_id OR public.is_admin(auth.uid()));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL, body text, link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own_read" ON public.notifications FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "notif_own_update" ON public.notifications FOR UPDATE USING (auth.uid()=user_id);

CREATE TABLE public.saved_gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, gig_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_gigs TO authenticated;
GRANT ALL ON public.saved_gigs TO service_role;
ALTER TABLE public.saved_gigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_own" ON public.saved_gigs FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.ai_search_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text, user_id uuid REFERENCES public.profiles(id),
  query text, refined_query text,
  suggested_categories text[], budget_filter text, delivery_filter text,
  confidence decimal, result_gig_ids uuid[],
  clicked_gig_id uuid REFERENCES public.gigs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_search_sessions TO anon, authenticated;
GRANT ALL ON public.ai_search_sessions TO service_role;
ALTER TABLE public.ai_search_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_anon_insert" ON public.ai_search_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "ai_own_read" ON public.ai_search_sessions FOR SELECT USING (auth.uid()=user_id OR public.is_admin(auth.uid()));

CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_public_read" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "ps_admin_write" ON public.platform_settings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.platform_settings(key,value) VALUES
  ('platform_fee_percent','20'),('auto_complete_days','3'),('clearance_days','14'),('min_gig_price','5');

INSERT INTO public.categories(name,slug,icon,sort_order) VALUES
  ('Programming & Tech','programming-tech','code',1),
  ('Design','design','palette',2),
  ('Writing & Translation','writing-translation','pen',3),
  ('Video & Animation','video-animation','video',4),
  ('Music & Audio','music-audio','music',5),
  ('Marketing','marketing','megaphone',6),
  ('Business','business','briefcase',7),
  ('AI Services','ai-services','sparkles',8);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_role public.user_role;
BEGIN
  new_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::public.user_role, 'client');
  INSERT INTO public.profiles (id, email, full_name, username, role, country)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
    NULLIF(NEW.raw_user_meta_data->>'username',''), new_role, NEW.raw_user_meta_data->>'country')
  ON CONFLICT (id) DO NOTHING;
  IF new_role = 'seller' THEN
    INSERT INTO public.seller_accounts(seller_id) VALUES (NEW.id) ON CONFLICT (seller_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER seller_accounts_updated_at BEFORE UPDATE ON public.seller_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER gigs_updated_at BEFORE UPDATE ON public.gigs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets(id,name,public) VALUES
  ('gig-images','gig-images',true),
  ('avatars','avatars',true),
  ('order-files','order-files',false),
  ('delivery-files','delivery-files',false),
  ('message-attachments','message-attachments',false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "gig_images_public_read" ON storage.objects FOR SELECT USING (bucket_id='gig-images');
CREATE POLICY "gig_images_owner_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='gig-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "gig_images_owner_update" ON storage.objects FOR UPDATE USING (bucket_id='gig-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "gig_images_owner_delete" ON storage.objects FOR DELETE USING (bucket_id='gig-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "order_files_party_read" ON storage.objects FOR SELECT USING (bucket_id='order-files' AND public.is_order_party(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "order_files_buyer_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='order-files' AND EXISTS(SELECT 1 FROM public.orders o WHERE o.id=((storage.foldername(name))[1])::uuid AND o.buyer_id=auth.uid()));
CREATE POLICY "delivery_files_party_read" ON storage.objects FOR SELECT USING (bucket_id='delivery-files' AND public.is_order_party(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "delivery_files_seller_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='delivery-files' AND EXISTS(SELECT 1 FROM public.orders o WHERE o.id=((storage.foldername(name))[1])::uuid AND o.seller_id=auth.uid()));
CREATE POLICY "msg_attach_read" ON storage.objects FOR SELECT USING (bucket_id='message-attachments');
CREATE POLICY "msg_attach_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);