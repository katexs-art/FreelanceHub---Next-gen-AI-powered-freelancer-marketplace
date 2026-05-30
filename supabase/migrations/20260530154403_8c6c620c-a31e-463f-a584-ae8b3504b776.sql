
-- Seed test users
DO $$
DECLARE
  u record;
  uid uuid;
BEGIN
  FOR u IN SELECT * FROM (VALUES
    ('buyer1@test.katexs.com', 'TestBuyer123!', 'Test Buyer One', 'client', NULL),
    ('buyer2@test.katexs.com', 'TestBuyer123!', 'Test Buyer Two', 'client', NULL),
    ('seller1@test.katexs.com', 'TestSeller123!', 'Test Seller One', 'seller', 'testseller1'),
    ('seller2@test.katexs.com', 'TestSeller123!', 'Test Seller Two', 'seller', 'testseller2'),
    ('seller3@test.katexs.com', 'TestSeller123!', 'Test Seller Three', 'seller', 'testseller3'),
    ('admin@test.katexs.com', 'TestAdmin123!', 'Test Admin', 'client', NULL)
  ) AS t(email, pw, full_name, role, username)
  LOOP
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = u.email) THEN
      CONTINUE;
    END IF;
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      u.email, crypt(u.pw, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', u.full_name, 'role', u.role, 'username', u.username),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', u.email), 'email', now(), now(), now());
  END LOOP;
END $$;

-- Promote admin
UPDATE public.profiles SET role = 'admin', seller_status = 'approved'
WHERE email = 'admin@test.katexs.com';

-- Approve and configure sellers
UPDATE public.profiles SET
  seller_status = 'approved',
  seller_skills = ARRAY['Voice AI','GoHighLevel','Chatbot Development'],
  primary_category = 'Sound and Speak with AI',
  river_score = 87.5,
  bio = 'Voice AI specialist'
WHERE email = 'seller1@test.katexs.com';

UPDATE public.profiles SET
  seller_status = 'approved',
  seller_skills = ARRAY['AI Automation','Zapier','Make','CRM Setup'],
  primary_category = 'Run with AI',
  river_score = 79.2,
  bio = 'Automation expert'
WHERE email = 'seller2@test.katexs.com';

UPDATE public.profiles SET
  seller_status = 'approved',
  seller_skills = ARRAY['AI Content','Copywriting','ChatGPT','Prompts'],
  primary_category = 'Write with AI',
  river_score = 72.8,
  bio = 'AI content writer'
WHERE email = 'seller3@test.katexs.com';

-- Starter gigs
INSERT INTO public.gigs (seller_id, title, description, category, tags, starting_price, status)
SELECT p.id, 'I will set up a voice AI assistant for your business',
  'Professional Voice AI assistant setup with custom greeting, call routing, and integration.',
  'Sound and Speak with AI', ARRAY['voice ai','vapi','assistant'], 150, 'active'::gig_status
FROM public.profiles p WHERE p.email = 'seller1@test.katexs.com'
  AND NOT EXISTS (SELECT 1 FROM public.gigs g WHERE g.seller_id = p.id);

INSERT INTO public.gigs (seller_id, title, description, category, tags, starting_price, status)
SELECT p.id, 'I will build AI automation workflows for your business',
  'Custom AI automation using Zapier, Make, and CRM integrations to save you hours every week.',
  'Run with AI', ARRAY['automation','zapier','make','crm'], 100, 'active'::gig_status
FROM public.profiles p WHERE p.email = 'seller2@test.katexs.com'
  AND NOT EXISTS (SELECT 1 FROM public.gigs g WHERE g.seller_id = p.id);

INSERT INTO public.gigs (seller_id, title, description, category, tags, starting_price, status)
SELECT p.id, 'I will write AI-powered content and copy that converts',
  'High-quality AI-assisted content writing, copywriting, and prompt engineering.',
  'Write with AI', ARRAY['content','copywriting','chatgpt','prompts'], 75, 'active'::gig_status
FROM public.profiles p WHERE p.email = 'seller3@test.katexs.com'
  AND NOT EXISTS (SELECT 1 FROM public.gigs g WHERE g.seller_id = p.id);
