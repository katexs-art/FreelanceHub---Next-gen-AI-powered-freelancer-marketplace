
## Goal
Add a dedicated, minimal admin sign-in page at `/admin/login` and make every `/admin*` route bounce non-admins to it. Touch nothing else.

## Changes

1. **New page `src/pages/admin/AdminLogin.tsx`**
   - Centered card, white bg.
   - "katexs." logo at top (same Syne mark used in `SiteHeader`).
   - Heading: "Admin Access" (20px, weight 700).
   - Subtitle: "Restricted to authorized personnel only" (13px, #666).
   - Email + password inputs, then a black, pill (border-radius 999px) "Sign In" button.
   - Submit:
     1. `supabase.auth.signInWithPassword({ email, password })`.
     2. On error → show inline error "Access denied — authorized personnel only." (no Supabase message leaked).
     3. On success, read `profiles.role` for the signed-in user; if `role === 'admin'` → `navigate('/admin')`. Otherwise call `supabase.auth.signOut()` and show the same error.
   - No Google button, no signup link, no "forgot password" link — fully isolated from the public auth flow.

2. **`src/components/ProtectedRoute.tsx`** — add an opt-in `adminRedirect` flag (or detect `roles=['admin']`) so that when the gate fails for an admin-only route it redirects to `/admin/login` instead of `/` or `/login`. Behavior for all non-admin routes stays identical.
   - If not signed in → `/admin/login` (only for admin routes).
   - If signed in but `profile.role !== 'admin'` → `/admin/login`.

3. **`src/App.tsx`**
   - Lazy-import `AdminLogin`.
   - Add `<Route path="/admin/login" element={<AdminLogin />} />` *before* the existing admin routes so it isn't caught by `/admin/:section`.
   - Update the 3 existing admin routes (`/admin`, `/admin/:section`, `/admin/river-ops`) to use the new admin-redirect behavior.

## Security notes
- No hardcoded credentials anywhere.
- Auth strictly through Supabase Auth.
- Admin determination strictly via `profiles.role === 'admin'`, evaluated after the session is established (RLS already allows a user to read their own profile).
- Non-admins that authenticate are signed back out so a stale session can't sit around.

## Out of scope
- No changes to the public `/login` page, no nav changes, no styling tokens, no DB migrations.
