-- Lock down anonymous LIST/enumeration on public buckets
-- Direct public-URL GETs still work because the buckets are marked public.
DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_authenticated_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS gig_images_public_read ON storage.objects;
CREATE POLICY gig_images_authenticated_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gig-images');

DROP POLICY IF EXISTS portfolio_public_read ON storage.objects;
CREATE POLICY portfolio_authenticated_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'seller-portfolio');