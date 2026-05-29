## Fix gigs.seller_id foreign key

Mirror the messages FK fix on the `gigs` table.

### Migration

```sql
ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS gigs_seller_id_fkey;
ALTER TABLE public.gigs
  ADD CONSTRAINT gigs_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

No code changes needed — app already inserts `seller_id` from `auth.uid()`.