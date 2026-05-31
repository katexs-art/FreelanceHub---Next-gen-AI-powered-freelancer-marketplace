-- Delete test accounts and their associated data, set auto release days
DO $$
DECLARE _ids uuid[];
BEGIN
  SELECT array_agg(id) INTO _ids FROM auth.users
    WHERE email IN (
      'buyer1@test.katexs.com','buyer2@test.katexs.com',
      'seller1@test.katexs.com','seller2@test.katexs.com','seller3@test.katexs.com',
      'admin@test.katexs.com'
    );

  IF _ids IS NOT NULL THEN
    DELETE FROM public.transactions WHERE seller_id = ANY(_ids)
      OR order_id IN (SELECT id FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids));
    DELETE FROM public.disputes WHERE order_id IN (SELECT id FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids));
    DELETE FROM public.order_deliveries WHERE order_id IN (SELECT id FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids));
    DELETE FROM public.order_requirements_answers WHERE order_id IN (SELECT id FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids));
    DELETE FROM public.cancellation_requests WHERE order_id IN (SELECT id FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids));
    DELETE FROM public.review_prompts WHERE buyer_id = ANY(_ids);
    DELETE FROM public.reviews WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids);
    DELETE FROM public.orders WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids);
    DELETE FROM public.bids WHERE seller_id = ANY(_ids)
      OR project_id IN (SELECT id FROM public.project_posts WHERE buyer_id = ANY(_ids));
    DELETE FROM public.project_posts WHERE buyer_id = ANY(_ids);
    DELETE FROM public.messages WHERE sender_id = ANY(_ids) OR recipient_id = ANY(_ids);
    DELETE FROM public.conversations WHERE participant_one = ANY(_ids) OR participant_two = ANY(_ids);
    DELETE FROM public.custom_offers WHERE buyer_id = ANY(_ids) OR seller_id = ANY(_ids);
    DELETE FROM public.notifications WHERE user_id = ANY(_ids);
    DELETE FROM public.saved_gigs WHERE user_id = ANY(_ids);
    DELETE FROM public.seller_follows WHERE follower_id = ANY(_ids) OR seller_id = ANY(_ids);
    DELETE FROM public.seller_verifications WHERE seller_id = ANY(_ids);
    DELETE FROM public.seller_applications WHERE seller_id = ANY(_ids);
    DELETE FROM public.seller_accounts WHERE seller_id = ANY(_ids);
    DELETE FROM public.gig_promotions WHERE seller_id = ANY(_ids);
    DELETE FROM public.gigs WHERE seller_id = ANY(_ids);
    DELETE FROM public.buyer_searches WHERE buyer_id = ANY(_ids);
    DELETE FROM public.ai_search_sessions WHERE user_id = ANY(_ids);
    DELETE FROM public.profiles WHERE id = ANY(_ids);
    DELETE FROM auth.users WHERE id = ANY(_ids);
  END IF;
END $$;

-- Disable test mode and ensure fee/auto-release settings are correct
INSERT INTO public.platform_settings(key, value) VALUES ('test_mode_enabled','false')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
INSERT INTO public.platform_settings(key, value) VALUES ('auto_release_days','4')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
INSERT INTO public.platform_settings(key, value) VALUES ('partner_fee','5')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
INSERT INTO public.platform_settings(key, value) VALUES ('expert_fee','10')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();