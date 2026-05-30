
-- 1. buyer_searches: restrict SELECT to owner
DROP POLICY IF EXISTS bs_auth_read ON public.buyer_searches;
CREATE POLICY bs_own_read ON public.buyer_searches
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

-- 2. profiles: hide email from anonymous visitors via column-level revoke
REVOKE SELECT (email) ON public.profiles FROM anon;

-- 3. project-files storage: add missing read/upload policies
DROP POLICY IF EXISTS "Project participants can read files" ON storage.objects;
DROP POLICY IF EXISTS "Project participants can upload files" ON storage.objects;

CREATE POLICY "Project participants can read files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_posts pp
    WHERE pp.id = ((storage.foldername(name))[1])::uuid
      AND (
        pp.buyer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.bids b WHERE b.project_id = pp.id AND b.seller_id = auth.uid())
      )
  )
);

CREATE POLICY "Project participants can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.project_posts pp
    WHERE pp.id = ((storage.foldername(name))[1])::uuid
      AND (
        pp.buyer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.bids b WHERE b.project_id = pp.id AND b.seller_id = auth.uid())
      )
  )
);
