
DO $$
DECLARE
  rec record;
  uid uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('maya.chen@demo.katexs.com',     'Maya Chen',          'mayachen',     'seller', 'Singapore',     'https://i.pravatar.cc/300?img=47', 'Brand & logo designer with 7+ years crafting identities for early-stage startups.', ARRAY['English','Mandarin']),
      ('diego.alvarez@demo.katexs.com', 'Diego Alvarez',      'diegobuilds',  'seller', 'Spain',         'https://i.pravatar.cc/300?img=12', 'Full-stack developer — React, Node, Supabase. I ship MVPs in days, not months.', ARRAY['English','Spanish']),
      ('sarah.okonkwo@demo.katexs.com', 'Sarah Okonkwo',      'sarahwrites',  'seller', 'Nigeria',       'https://i.pravatar.cc/300?img=48', 'Copywriter for SaaS and DTC. Words that sell, not just sit there.', ARRAY['English']),
      ('tomas.ribeiro@demo.katexs.com', 'Tomas Ribeiro',      'tomasedits',   'seller', 'Portugal',      'https://i.pravatar.cc/300?img=15', 'Video editor for YouTube creators and brands. Fast turnarounds, cinematic finish.', ARRAY['English','Portuguese']),
      ('aiko.tanaka@demo.katexs.com',   'Aiko Tanaka',        'aikovoice',    'seller', 'Japan',         'https://i.pravatar.cc/300?img=44', 'Bilingual voice-over artist — warm, conversational, broadcast-ready.', ARRAY['English','Japanese']),
      ('marcus.johnson@demo.katexs.com','Marcus Johnson',     'marcusseo',    'seller', 'United States', 'https://i.pravatar.cc/300?img=33', 'SEO specialist helping B2B brands rank for high-intent keywords.', ARRAY['English']),
      ('priya.sharma@demo.katexs.com',  'Priya Sharma',       'priyaai',      'seller', 'India',         'https://i.pravatar.cc/300?img=49', 'AI prompt engineer & GPT workflow consultant. I make AI actually useful.', ARRAY['English','Hindi']),
      ('lena.kowalski@demo.katexs.com', 'Lena Kowalski',      'lenastrategy', 'seller', 'Poland',        'https://i.pravatar.cc/300?img=45', 'Business strategist for founders. Pitch decks, financial models, GTM plans.', ARRAY['English','Polish','German']),
      ('james.miller@demo.katexs.com',  'James Miller',       NULL, 'client', 'United States', 'https://i.pravatar.cc/300?img=11', NULL, NULL),
      ('olivia.brown@demo.katexs.com',  'Olivia Brown',       NULL, 'client', 'United Kingdom','https://i.pravatar.cc/300?img=5',  NULL, NULL),
      ('liam.davis@demo.katexs.com',    'Liam Davis',         NULL, 'client', 'Canada',        'https://i.pravatar.cc/300?img=13', NULL, NULL),
      ('emma.wilson@demo.katexs.com',   'Emma Wilson',        NULL, 'client', 'Australia',     'https://i.pravatar.cc/300?img=16', NULL, NULL),
      ('noah.garcia@demo.katexs.com',   'Noah Garcia',        NULL, 'client', 'Mexico',        'https://i.pravatar.cc/300?img=14', NULL, NULL),
      ('ava.martinez@demo.katexs.com',  'Ava Martinez',       NULL, 'client', 'Spain',         'https://i.pravatar.cc/300?img=20', NULL, NULL),
      ('william.lee@demo.katexs.com',   'William Lee',        NULL, 'client', 'South Korea',   'https://i.pravatar.cc/300?img=17', NULL, NULL),
      ('sophia.kim@demo.katexs.com',    'Sophia Kim',         NULL, 'client', 'South Korea',   'https://i.pravatar.cc/300?img=21', NULL, NULL),
      ('lucas.silva@demo.katexs.com',   'Lucas Silva',        NULL, 'client', 'Brazil',        'https://i.pravatar.cc/300?img=18', NULL, NULL),
      ('isabella.rossi@demo.katexs.com','Isabella Rossi',     NULL, 'client', 'Italy',         'https://i.pravatar.cc/300?img=24', NULL, NULL),
      ('mateo.lopez@demo.katexs.com',   'Mateo Lopez',        NULL, 'client', 'Argentina',     'https://i.pravatar.cc/300?img=22', NULL, NULL),
      ('mia.dubois@demo.katexs.com',    'Mia Dubois',         NULL, 'client', 'France',        'https://i.pravatar.cc/300?img=25', NULL, NULL),
      ('ethan.muller@demo.katexs.com',  'Ethan Muller',       NULL, 'client', 'Germany',       'https://i.pravatar.cc/300?img=51', NULL, NULL),
      ('charlotte.ng@demo.katexs.com',  'Charlotte Ng',       NULL, 'client', 'Singapore',     'https://i.pravatar.cc/300?img=26', NULL, NULL),
      ('aiden.patel@demo.katexs.com',   'Aiden Patel',        NULL, 'client', 'India',         'https://i.pravatar.cc/300?img=52', NULL, NULL),
      ('amelia.novak@demo.katexs.com',  'Amelia Novak',       NULL, 'client', 'Czechia',       'https://i.pravatar.cc/300?img=27', NULL, NULL),
      ('henry.schmidt@demo.katexs.com', 'Henry Schmidt',      NULL, 'client', 'Germany',       'https://i.pravatar.cc/300?img=53', NULL, NULL),
      ('harper.evans@demo.katexs.com',  'Harper Evans',       NULL, 'client', 'Ireland',       'https://i.pravatar.cc/300?img=28', NULL, NULL),
      ('jack.obrien@demo.katexs.com',   'Jack OBrien',        NULL, 'client', 'Ireland',       'https://i.pravatar.cc/300?img=54', NULL, NULL),
      ('zoe.andersen@demo.katexs.com',  'Zoe Andersen',       NULL, 'client', 'Denmark',       'https://i.pravatar.cc/300?img=32', NULL, NULL),
      ('samuel.cohen@demo.katexs.com',  'Samuel Cohen',       NULL, 'client', 'Israel',        'https://i.pravatar.cc/300?img=60', NULL, NULL),
      ('ruby.thompson@demo.katexs.com', 'Ruby Thompson',      NULL, 'client', 'New Zealand',   'https://i.pravatar.cc/300?img=36', NULL, NULL)
    ) AS t(email, full_name, username, role, country, avatar_url, bio, languages)
  LOOP
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = rec.email) THEN CONTINUE; END IF;
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      rec.email, crypt('DemoPass!2026', gen_salt('bf')),
      now(), now() - (random() * interval '500 days'), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', rec.full_name, 'role', rec.role, 'username', rec.username, 'country', rec.country),
      false, false
    );
    UPDATE public.profiles
       SET avatar_url = rec.avatar_url,
           bio = rec.bio,
           languages = COALESCE(rec.languages, ARRAY[]::text[]),
           member_since = now() - (random() * interval '500 days'),
           response_rate = CASE WHEN rec.role='seller' THEN ROUND((88 + random()*12)::numeric, 1) ELSE NULL END,
           response_time_minutes = CASE WHEN rec.role='seller' THEN (15 + floor(random()*120))::int ELSE NULL END
     WHERE id = uid;
    IF rec.role = 'seller' THEN
      UPDATE public.seller_accounts
         SET onboarding_complete = true, charges_enabled = true, payouts_enabled = true,
             available_balance = (5000 + floor(random()*40000))::int,
             pending_balance = (1000 + floor(random()*8000))::int,
             lifetime_earnings = (20000 + floor(random()*300000))::int
       WHERE seller_id = uid;
    END IF;
  END LOOP;
END $$;

-- Create gigs for each seller
DO $$
DECLARE
  s_maya uuid := (SELECT id FROM public.profiles WHERE username='mayachen');
  s_diego uuid := (SELECT id FROM public.profiles WHERE username='diegobuilds');
  s_sarah uuid := (SELECT id FROM public.profiles WHERE username='sarahwrites');
  s_tomas uuid := (SELECT id FROM public.profiles WHERE username='tomasedits');
  s_aiko uuid := (SELECT id FROM public.profiles WHERE username='aikovoice');
  s_marcus uuid := (SELECT id FROM public.profiles WHERE username='marcusseo');
  s_priya uuid := (SELECT id FROM public.profiles WHERE username='priyaai');
  s_lena uuid := (SELECT id FROM public.profiles WHERE username='lenastrategy');
  gid uuid;
  gigs_data record;
BEGIN
  FOR gigs_data IN
    SELECT * FROM (VALUES
      (s_maya,   'I will design a modern minimalist logo with brand guidelines',     'design',              'logo-design',     ARRAY['logo','branding','minimalist'],     45,  'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80', 4.9, 142),
      (s_maya,   'I will create a complete brand identity package',                  'design',              'brand-identity',  ARRAY['branding','identity','design'],     180, 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=80',   4.8, 67),
      (s_diego,  'I will build your React and Supabase MVP in 7 days',               'programming-tech',    'web-dev',         ARRAY['react','supabase','mvp'],           650, 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80', 5.0, 89),
      (s_diego,  'I will fix bugs and add features to your existing web app',        'programming-tech',    'web-dev',         ARRAY['react','typescript','bugfix'],      85,  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',  4.9, 213),
      (s_sarah,  'I will write high-converting landing page copy',                    'writing-translation', 'copywriting',     ARRAY['copywriting','landing','saas'],     120, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80', 4.9, 178),
      (s_sarah,  'I will write SEO blog articles that actually rank',                 'writing-translation', 'content',         ARRAY['blog','seo','content'],             65,  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80', 4.7, 94),
      (s_tomas,  'I will edit your YouTube video with motion graphics',               'video-animation',     'video-editing',   ARRAY['youtube','editing','motion'],       95,  'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80', 4.9, 256),
      (s_aiko,   'I will record a professional English or Japanese voice over',       'music-audio',         'voiceover',       ARRAY['voiceover','japanese','english'],   55,  'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80', 5.0, 119),
      (s_marcus, 'I will do complete SEO audit and 90-day growth plan',               'digital-marketing',   'seo',             ARRAY['seo','audit','strategy'],           220, 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&q=80', 4.8, 73),
      (s_priya,  'I will build custom GPT workflows and automations for your team',   'ai-services',         'ai-automation',   ARRAY['gpt','automation','ai'],            180, 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80', 4.9, 51),
      (s_priya,  'I will craft expert prompts for ChatGPT, Claude, and Gemini',       'ai-services',         'prompt-engineering', ARRAY['prompts','chatgpt','claude'],    35,  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80', 4.8, 188),
      (s_lena,   'I will create an investor-ready pitch deck and financial model',    'business',            'consulting',      ARRAY['pitch','deck','startup'],           320, 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80', 4.9, 42)
    ) AS t(seller_id, title, category, subcategory, tags, price, thumb, rating, reviews)
  LOOP
    gid := gen_random_uuid();
    INSERT INTO public.gigs (id, seller_id, title, description, category, subcategory, tags, thumbnail_url, gallery_urls, starting_price, status, total_reviews, average_rating, total_orders, impressions, clicks, created_at)
    VALUES (gid, gigs_data.seller_id, gigs_data.title,
      gigs_data.title || E'.\n\nWhat you get:\n- Professional, high-quality work tailored to your brief\n- Fast turnaround and clear communication\n- Unlimited revisions until you''re happy\n- Source files included\n\nMessage me before ordering so I can make sure I''m the right fit for your project.',
      gigs_data.category, gigs_data.subcategory, gigs_data.tags, gigs_data.thumb,
      ARRAY[gigs_data.thumb], gigs_data.price, 'active'::gig_status,
      gigs_data.reviews, gigs_data.rating, (gigs_data.reviews + floor(random()*40))::int,
      (gigs_data.reviews * 30 + floor(random()*2000))::int,
      (gigs_data.reviews * 5 + floor(random()*200))::int,
      now() - (random() * interval '300 days'));
    -- 3 packages
    INSERT INTO public.gig_packages (gig_id, package_type, title, description, price, delivery_days, revisions, features) VALUES
      (gid, 'basic',    'Basic',    'Starter package — perfect for small projects', gigs_data.price, 5, 1, ARRAY['1 concept','Source file','Commercial use']),
      (gid, 'standard', 'Standard', 'Most popular — best value for most clients',   (gigs_data.price * 2.2)::int, 7, 3, ARRAY['3 concepts','Source files','Commercial use','High-res export']),
      (gid, 'premium',  'Premium',  'Complete package — everything you need',       (gigs_data.price * 4)::int, 10, 5, ARRAY['Unlimited concepts','All source files','Commercial use','Priority support','30-day follow-up']);
  END LOOP;
END $$;
