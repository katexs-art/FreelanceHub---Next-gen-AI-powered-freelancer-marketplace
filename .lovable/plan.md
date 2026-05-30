
# Seller Approval Flow — Plan

This refines the existing onboarding to match the new spec exactly. No existing colors, fonts, images, layout, or styling will be modified. All new UI uses tokens/utilities already present in the project.

## 1. Database (migration)

Create a dedicated applications table (the current flow stores data directly on `profiles`; spec requires a separate table).

```sql
create table public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  bio text not null,
  location text not null,
  language text not null,
  skills text[] not null default '{}',
  primary_category text not null,
  secondary_category text,
  experience_description text not null,
  packages jsonb not null default '[]'::jsonb,
  portfolio_urls text[] not null default '{}',
  status text not null default 'pending',     -- pending | approved | rejected
  admin_notes text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- GRANTs (required)
grant select, insert on public.seller_applications to authenticated;
grant all on public.seller_applications to service_role;

alter table public.seller_applications enable row level security;

create policy sa_own_read on public.seller_applications
  for select to authenticated
  using (auth.uid() = seller_id or public.is_admin(auth.uid()));

create policy sa_own_insert on public.seller_applications
  for insert to authenticated
  with check (auth.uid() = seller_id);

create policy sa_admin_update on public.seller_applications
  for update to authenticated
  using (public.is_admin(auth.uid()));
```

Update RPCs:

- `submit_seller_application(...)` extended to accept `_experience_description` and `_language`; also inserts a row in `seller_applications` (status=`pending`), and sets `profiles.seller_status = 'pending_approval'`. Admin notification text changed to "New seller application submitted — review now."
- `approve_seller(_seller, _notes)` and `reject_seller(_seller, _reason)` also update the latest matching `seller_applications` row (`status`, `reviewed_at = now()`, `reviewed_by = auth.uid()`, `admin_notes`/`rejection_reason`). Notification copy updated to spec.

`notify_river_match` already skips non-approved sellers — no change needed there.

## 2. Onboarding flow (`/seller-onboarding`)

Rewrite `src/pages/SellerOnboarding.tsx` as 5 steps with the progress bar at top labeled: Profile · Skills · Category · Packages · Submit.

- **Step 1 Profile** — full name, photo upload (optional), one-line specialty bio, "city and country" field, primary language. All required except photo. "Next" disabled until valid.
- **Step 2 Skills** — pill tag input (Enter to add). Min 3 to proceed. Suggestions: top 10 most common skills computed from `profiles.seller_skills` of approved sellers (`unnest` + `count`), rendered as clickable pills under the input.
- **Step 3 Category** — primary dropdown (from `categories`), optional secondary dropdown, "Describe your experience" textarea with the exact placeholder, min 80 chars enforced with live counter.
- **Step 4 Packages** — Basic / Standard / Premium cards side by side (stack on mobile). Each: title, description, price ($), delivery days. Basic required; Standard and Premium optional (only validated if any field is filled).
- **Step 5 Submit** — read-only summary of every field. Black filled "Submit My Application" button, border-radius 999px. Calls the updated RPC, then redirects to `/seller/dashboard`.

Redirect on first switch to Selling mode: in `RoleSwitcher` (and any "Activate seller mode" flow in `BecomeSeller`), if `profile.seller_status === 'onboarding'` send the user to `/seller-onboarding` instead of `/seller/dashboard`.

## 3. Seller Dashboard status UI

In `src/pages/seller/SellerDashboard.tsx`:

- `pending_approval` → persistent yellow banner: "Your seller application is under review. We will notify you within 24 hours." Hide gig-creation CTAs, hide River-matching widgets, and gate any "create gig" link. (Server-side, `gigs_seller_insert` policy already enforces `seller_status='approved'`.)
- `rejected` → persistent red banner: "Your application was not approved." plus `profiles.rejection_reason`. Show a link back to `/seller-onboarding` to resubmit.
- `approved` → one-time green sonner toast "You are approved — start selling on Katexs now." Tracked via a small localStorage flag keyed by user id so it fires exactly once.

Banners use existing semantic tokens (`bg-yellow-50/border-yellow-200` etc. as already used in the codebase) — no new colors.

## 4. Admin review

Add a dedicated route `/admin/seller-applications` rendering a new page `src/pages/admin/SellerApplicationsPage.tsx`. The existing in-tab `SellerApprovalsQueue` continues to work; the new page reuses the same component (or a thin list variant) so we don't duplicate logic.

Page contents per spec:
- List of pending applications sorted by `created_at` asc (oldest first).
- Each row: seller name, primary category, skills as pill badges, experience description, green "Approve" button, red "Reject" button.
- Reject opens an inline text input + "Confirm Reject" button. Approve and Reject call the updated RPCs.

Notifications + email copy match spec exactly:
- Approve: "Congratulations — you are approved to sell on Katexs. Start building your profile and getting matched to buyers today."
- Reject: "Your Katexs seller application was not approved." + reason. (Sent via `send-marketplace-email` edge function in addition to in-app notification.)

Add route in `src/App.tsx` under the existing admin protection: `<Route path="/admin/seller-applications" element={<ProtectedRoute roles={["admin"]}><SellerApplicationsPage /></ProtectedRoute>} />`.

## 5. Files touched

- New migration creating `seller_applications` + updated RPCs.
- `src/pages/SellerOnboarding.tsx` — rewrite to 5 steps, add skill suggestions and experience description, drop existing portfolio step (kept inside Step 4 packages or removed per spec which lists 5 steps only).
- `src/pages/seller/SellerDashboard.tsx` — add status banners, gate seller features, one-time approved toast.
- `src/components/layout/RoleSwitcher.tsx` and `src/pages/BecomeSeller.tsx` — redirect to `/seller-onboarding` when `seller_status === 'onboarding'`.
- `src/pages/admin/SellerApplicationsPage.tsx` (new) + route in `src/App.tsx`.
- `src/hooks/useAuth.ts` — no schema change needed (already exposes `seller_status`, `rejection_reason`).

No edits to global tokens, fonts, images, or shared layout components.
