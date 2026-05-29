
-- 1. profiles email exposure: revoke email column from anon; only authenticated can read it.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, username, role, avatar_url, country, bio, languages, is_online, last_seen, member_since, created_at, updated_at, response_rate, response_time_minutes, suspended_at)
  ON public.profiles TO anon;

-- 2. seller_verifications: hide document URLs from public; expose only status via helper function
DROP POLICY IF EXISTS verif_public_read_status ON public.seller_verifications;
CREATE POLICY verif_owner_admin_read ON public.seller_verifications
  FOR SELECT USING (auth.uid() = seller_id OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_seller_verification_status(_seller uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT status FROM public.seller_verifications WHERE seller_id = _seller LIMIT 1 $$;
GRANT EXECUTE ON FUNCTION public.get_seller_verification_status(uuid) TO anon, authenticated;

-- 3. gig_promotions: hide spend/perf metrics from the public-active policy via column grants
REVOKE SELECT ON public.gig_promotions FROM anon, authenticated;
GRANT SELECT (id, gig_id, status, starts_at, ends_at) ON public.gig_promotions TO anon, authenticated;
GRANT SELECT ON public.gig_promotions TO service_role;
-- Sellers and admins still get full read via the existing promo_seller_read_all policy — re-grant full cols to them through a function:
CREATE OR REPLACE FUNCTION public.get_my_promotion_stats()
RETURNS SETOF public.gig_promotions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.gig_promotions WHERE seller_id = auth.uid() OR public.is_admin(auth.uid()) $$;
GRANT EXECUTE ON FUNCTION public.get_my_promotion_stats() TO authenticated;

-- 4. ai_search_sessions: restrict anon insert to null/own user_id
DROP POLICY IF EXISTS ai_anon_insert ON public.ai_search_sessions;
CREATE POLICY ai_insert_scoped ON public.ai_search_sessions
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 5. orders: prevent buyers/sellers from changing financial/status fields via a trigger
CREATE OR REPLACE FUNCTION public.orders_guard_sensitive_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.price IS DISTINCT FROM OLD.price
     OR NEW.platform_fee IS DISTINCT FROM OLD.platform_fee
     OR NEW.seller_earnings IS DISTINCT FROM OLD.seller_earnings
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_charge_id IS DISTINCT FROM OLD.stripe_charge_id
     OR NEW.refund_id IS DISTINCT FROM OLD.refund_id
     OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
     OR NEW.platform_fee IS DISTINCT FROM OLD.platform_fee
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.gig_id IS DISTINCT FROM OLD.gig_id
     OR NEW.order_number IS DISTINCT FROM OLD.order_number
     OR NEW.status IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION 'Financial and status fields can only be changed by the system';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_guard_sensitive_updates_t ON public.orders;
CREATE TRIGGER orders_guard_sensitive_updates_t
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_sensitive_updates();

-- 6. message-attachments storage: restrict SELECT to uploader or message party
DROP POLICY IF EXISTS msg_attach_read ON storage.objects;
CREATE POLICY msg_attach_read ON storage.objects FOR SELECT USING (
  bucket_id = 'message-attachments' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.attachment_url LIKE '%' || name
        AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
  )
);

-- 7. avatars: add owner DELETE policy
CREATE POLICY avatars_owner_delete ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 8. order-files & delivery-files: owner DELETE policies
CREATE POLICY order_files_owner_delete ON storage.objects FOR DELETE USING (
  bucket_id = 'order-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY delivery_files_owner_delete ON storage.objects FOR DELETE USING (
  bucket_id = 'delivery-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
