# Enable admin access

## Problem
`admin@katexs.com` logs in successfully but has no row in `profiles`, so `useMarketplaceAuth` returns `profile = null`. As a result:
- The "Admin" link never appears in the nav
- Login redirects to `/dashboard/client` instead of `/admin`
- `MarketplaceAdmin` page bounces back to `/` because `profile?.role !== "admin"`

The root cause is that the `handle_new_user()` function exists but is not attached to `auth.users`, so no profile is ever created on signup.

## Fix

1. **Backfill profile for the admin user**
   Insert a row into `public.profiles` for user id `ff9e32b8-8407-4a70-af4a-3a83560b42c1` with:
   - `email = 'admin@katexs.com'`
   - `full_name = 'Katexs Admin'`
   - `role = 'admin'`

2. **Attach `handle_new_user` trigger to `auth.users`**
   `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`
   This ensures every future signup (client or expert) automatically gets a `profiles` row with the correct role from signup metadata — so no one else hits the same blank-profile issue.

3. **Backfill profiles for any other existing auth users without one** (safety net for accounts created before the trigger existed).

## Result
- Log out and log back in as `admin@katexs.com` → routed to `/marketplace/admin`
- Admin nav link appears (neon green)
- Future signups work end-to-end without manual profile creation
