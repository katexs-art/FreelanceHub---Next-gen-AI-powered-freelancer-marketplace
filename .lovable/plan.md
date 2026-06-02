## Overview
Provision three Supabase Storage buckets with RLS policies on `storage.objects` matching the access rules described.

## Buckets

| Bucket | Visibility | Purpose |
|---|---|---|
| `gig-images` | public | Gig thumbnails + gallery |
| `avatars` | public | Profile photos |
| `delivery-files` | private | Completed order deliverables (signed URLs only) |

Buckets will be created via the `supabase--storage_create_bucket` tool (SQL inserts into `storage.buckets` are unsupported).

## Folder convention

All policies assume objects are stored under a top-level folder keyed to a user or order id, so `(storage.foldername(name))[1]` can be used for ownership checks.

- `gig-images/<seller_user_id>/...`
- `avatars/<user_id>/...`
- `delivery-files/<order_id>/...`

## RLS policies (single migration on `storage.objects`)

```sql
-- gig-images: public read, sellers upload/manage own folder
CREATE POLICY "gig-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gig-images');

CREATE POLICY "gig-images sellers upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gig-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "gig-images sellers update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'gig-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "gig-images sellers delete own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gig-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- avatars: public read, users manage only their own avatar
CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars users upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- delivery-files: only buyer/seller on the order can read; only seller can write
CREATE POLICY "delivery-files order parties read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'delivery-files'
    AND public.is_order_party(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "delivery-files seller upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-files'
    AND EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = ((storage.foldername(name))[1])::uuid
         AND o.seller_id = auth.uid()
    )
  );

CREATE POLICY "delivery-files seller update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'delivery-files'
    AND EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = ((storage.foldername(name))[1])::uuid
         AND o.seller_id = auth.uid()
    )
  );

CREATE POLICY "delivery-files seller delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'delivery-files'
    AND EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = ((storage.foldername(name))[1])::uuid
         AND o.seller_id = auth.uid()
    )
  );
```

The delivery-files read policy reuses the existing `public.is_order_party(order_id, user_id)` security-definer function so both the buyer and seller on the order can list/sign URLs.

## Notes
- Public bucket creation may be rejected if the workspace has `cloud_block_public_buckets` enabled. If that happens for `gig-images` or `avatars`, I'll surface the error and ask whether to enable public buckets in workspace settings or keep them private with read policies.
- No app/frontend changes — uploaders will need to write paths under `<user_id>/...` or `<order_id>/...` to satisfy the policies. I'll note this for whoever wires up the upload UI.

## Out of scope
- No changes to existing tables/functions.
- No frontend code changes.
