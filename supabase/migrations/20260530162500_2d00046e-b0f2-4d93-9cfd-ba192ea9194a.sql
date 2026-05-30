
-- 1) Test mode setting
INSERT INTO public.platform_settings(key, value)
VALUES ('test_mode_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- 2) Seed test auth users
DO $$
DECLARE
  _accounts jsonb := '[
    {"email":"buyer1@test.katexs.com","password":"TestBuyer123!","role":"client","full_name":"Test Buyer One"},
    {"email":"buyer2@test.katexs.com","password":"TestBuyer123!","role":"client","full_name":"Test Buyer Two"},
    {"email":"seller1@test.katexs.com","password":"TestSeller123!","role":"seller","full_name":"Test Seller One"},
    {"email":"seller2@test.katexs.com","password":"TestSeller123!","role":"seller","full_name":"Test Seller Two"},
    {"email":"seller3@test.katexs.com","password":"TestSeller123!","role":"seller","full_name":"Test Seller Three"},
    {"email":"admin@test.katexs.com","password":"TestAdmin123!","role":"client","full_name":"Test Admin"}
  ]'::jsonb;
  _acc jsonb;
  _uid uuid;
BEGIN
  FOR _acc IN SELECT * FROM jsonb_array_elements(_accounts) LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = _acc->>'email') THEN
      _uid := gen_random_uuid();
      INSERT INTO auth.users(
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        _uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        _acc->>'email', crypt(_acc->>'password', gen_salt('bf')),
        now(),
        jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
        jsonb_build_object('full_name', _acc->>'full_name', 'role', _acc->>'role'),
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities(
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), _uid,
        jsonb_build_object('sub', _uid::text, 'email', _acc->>'email'),
        'email', _acc->>'email', now(), now(), now()
      );
    END IF;
  END LOOP;
END $$;

-- 3) Approve test sellers + admin role
UPDATE public.profiles SET role = 'admin', seller_status = 'approved'
  WHERE email = 'admin@test.katexs.com';

UPDATE public.profiles SET
  seller_status = 'approved',
  seller_skills = ARRAY['Voice AI','GoHighLevel','Chatbot Development'],
  primary_category = 'Sound and Speak with AI',
  river_score = 87.5
WHERE email = 'seller1@test.katexs.com';

UPDATE public.profiles SET
  seller_status = 'approved',
  seller_skills = ARRAY['AI Automation','Zapier','Make','CRM Setup'],
  primary_category = 'Run with AI',
  river_score = 79.2
WHERE email = 'seller2@test.katexs.com';

UPDATE public.profiles SET
  seller_status = 'approved',
  seller_skills = ARRAY['AI Content','Copywriting','ChatGPT','Prompts'],
  primary_category = 'Write with AI',
  river_score = 72.8
WHERE email = 'seller3@test.katexs.com';

-- Ensure seller_accounts rows exist
INSERT INTO public.seller_accounts(seller_id)
SELECT id FROM public.profiles
 WHERE email IN ('seller1@test.katexs.com','seller2@test.katexs.com','seller3@test.katexs.com')
ON CONFLICT (seller_id) DO NOTHING;

-- 4) Starter gigs (one per seller, if none exist for that seller email)
DO $$
DECLARE
  _s1 uuid; _s2 uuid; _s3 uuid;
  _gid uuid;
BEGIN
  SELECT id INTO _s1 FROM public.profiles WHERE email='seller1@test.katexs.com';
  SELECT id INTO _s2 FROM public.profiles WHERE email='seller2@test.katexs.com';
  SELECT id INTO _s3 FROM public.profiles WHERE email='seller3@test.katexs.com';

  IF _s1 IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.gigs WHERE seller_id=_s1) THEN
    INSERT INTO public.gigs(seller_id, title, description, category, status, starting_price, tags)
    VALUES (_s1, 'Voice AI assistant setup', 'Custom voice AI caller built on GoHighLevel.', 'Sound and Speak with AI', 'active', 150, ARRAY['voice ai','ghl','caller'])
    RETURNING id INTO _gid;
    INSERT INTO public.gig_packages(gig_id, package_type, title, price, delivery_days, revisions, features)
    VALUES (_gid, 'basic', 'Starter', 150, 3, 1, ARRAY['1 voice agent','Basic script']);
  END IF;

  IF _s2 IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.gigs WHERE seller_id=_s2) THEN
    INSERT INTO public.gigs(seller_id, title, description, category, status, starting_price, tags)
    VALUES (_s2, 'AI automation workflows', 'Zapier/Make automations and CRM setup.', 'Run with AI', 'active', 100, ARRAY['automation','zapier','make'])
    RETURNING id INTO _gid;
    INSERT INTO public.gig_packages(gig_id, package_type, title, price, delivery_days, revisions, features)
    VALUES (_gid, 'basic', 'Starter', 100, 5, 1, ARRAY['1 workflow','Setup']);
  END IF;

  IF _s3 IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.gigs WHERE seller_id=_s3) THEN
    INSERT INTO public.gigs(seller_id, title, description, category, status, starting_price, tags)
    VALUES (_s3, 'AI-written copy & content', 'High-converting AI copy.', 'Write with AI', 'active', 75, ARRAY['copy','content','chatgpt'])
    RETURNING id INTO _gid;
    INSERT INTO public.gig_packages(gig_id, package_type, title, price, delivery_days, revisions, features)
    VALUES (_gid, 'basic', 'Starter', 75, 2, 1, ARRAY['500 words','1 revision']);
  END IF;
END $$;

-- 5) Admin-only reset helpers
CREATE OR REPLACE FUNCTION public.reset_test_orders()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ids uuid[];
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT array_agg(id) INTO _ids FROM auth.users WHERE email LIKE '%@test.katexs.com';
  IF _ids IS NULL THEN RETURN; END IF;
  DELETE FROM public.transactions WHERE seller_id = ANY(_ids) OR order_id IN (SELECT id FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids));
  DELETE FROM public.disputes WHERE order_id IN (SELECT id FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids));
  DELETE FROM public.order_deliveries WHERE order_id IN (SELECT id FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids));
  DELETE FROM public.review_prompts WHERE buyer_id = ANY(_ids);
  DELETE FROM public.reviews WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids);
  DELETE FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids);
  DELETE FROM public.bids WHERE seller_id = ANY(_ids) OR project_id IN (SELECT id FROM public.project_posts WHERE buyer_id = ANY(_ids));
  DELETE FROM public.project_posts WHERE buyer_id = ANY(_ids);
END $$;

CREATE OR REPLACE FUNCTION public.clear_test_messages()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ids uuid[];
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT array_agg(id) INTO _ids FROM auth.users WHERE email LIKE '%@test.katexs.com';
  IF _ids IS NULL THEN RETURN; END IF;
  DELETE FROM public.messages WHERE sender_id = ANY(_ids) OR recipient_id = ANY(_ids);
  DELETE FROM public.conversations WHERE participant_one = ANY(_ids) OR participant_two = ANY(_ids);
  DELETE FROM public.notifications WHERE user_id = ANY(_ids);
END $$;

CREATE OR REPLACE FUNCTION public.reset_test_users()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM public.reset_test_orders();
  PERFORM public.clear_test_messages();
  -- Re-apply seller defaults
  UPDATE public.profiles SET seller_status='approved', seller_skills=ARRAY['Voice AI','GoHighLevel','Chatbot Development'], primary_category='Sound and Speak with AI', river_score=87.5 WHERE email='seller1@test.katexs.com';
  UPDATE public.profiles SET seller_status='approved', seller_skills=ARRAY['AI Automation','Zapier','Make','CRM Setup'], primary_category='Run with AI', river_score=79.2 WHERE email='seller2@test.katexs.com';
  UPDATE public.profiles SET seller_status='approved', seller_skills=ARRAY['AI Content','Copywriting','ChatGPT','Prompts'], primary_category='Write with AI', river_score=72.8 WHERE email='seller3@test.katexs.com';
  UPDATE public.profiles SET role='admin', seller_status='approved' WHERE email='admin@test.katexs.com';
END $$;

-- 6) Simulate time advance for an order (test mode + admin only, only @test.katexs.com)
CREATE OR REPLACE FUNCTION public.simulate_order_time_advance(_order_id uuid, _mode text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _o record; _buyer_email text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT o.*, u.email INTO _o FROM public.orders o JOIN auth.users u ON u.id=o.buyer_id WHERE o.id=_order_id;
  IF _o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _o.email NOT LIKE '%@test.katexs.com' THEN RAISE EXCEPTION 'only test orders allowed'; END IF;

  IF _mode = 'halfway' THEN
    UPDATE public.orders SET delivery_deadline = now() + interval '12 hours' WHERE id=_order_id;
  ELSIF _mode = 'past_deadline' THEN
    UPDATE public.orders SET auto_complete_at = now() - interval '1 minute', dispute_deadline = now() - interval '1 minute' WHERE id=_order_id;
  END IF;
END $$;

-- 7) Mark order paid (simulated)
CREATE OR REPLACE FUNCTION public.simulate_mark_order_paid(_order_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _o record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF (SELECT value FROM public.platform_settings WHERE key='test_mode_enabled') <> 'true' THEN
    RAISE EXCEPTION 'test mode not enabled';
  END IF;
  SELECT o.*, u.email AS buyer_email INTO _o FROM public.orders o JOIN auth.users u ON u.id=o.buyer_id WHERE o.id=_order_id;
  IF _o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _o.buyer_email NOT LIKE '%@test.katexs.com' THEN RAISE EXCEPTION 'only test orders allowed'; END IF;

  UPDATE public.orders SET
    status = 'in_progress',
    escrow_status = 'held',
    stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, 'pi_test_simulated_' || _order_id::text),
    requirements_submitted = true,
    requirements_submitted_at = COALESCE(requirements_submitted_at, now()),
    updated_at = now()
  WHERE id = _order_id;

  INSERT INTO public.transactions(seller_id, order_id, type, status, amount, clears_at)
  SELECT _o.seller_id, _o.id, 'seller_credit'::transaction_type, 'pending'::transaction_status, _o.seller_earnings, now() + interval '14 days'
  WHERE NOT EXISTS (SELECT 1 FROM public.transactions WHERE order_id=_o.id AND type='seller_credit');
END $$;
