# Full Profile Editing in Settings

Replace the current minimal `/settings` page with a comprehensive profile editor that mirrors the seller profile fields and saves directly to the `profiles` table.

## Schema changes (migration)

Add columns to `public.profiles`:
- `years_experience` (int)
- `certifications` (jsonb, default `[]`) — array of `{name, organization, year}`
- `portfolio_links` (jsonb, default `[]`) — array of `{label, url}` (replaces flat `portfolio_urls` use here; keep old column intact for backward compat)

No RLS changes needed — existing self-update policy on `profiles` already covers these.

## Storage

`avatars` bucket already exists and is public. `kyc-documents` exists for verification uploads. No bucket changes needed.

## Page structure (`src/pages/account/Settings.tsx`)

Rewrite as a single-page editor with these sections, using existing design tokens (no hardcoded colors):

### 1. Profile Photo
- 120px circle showing `avatar_url` or initials fallback (colored bg from name hash)
- "Upload Photo" button → file picker (jpg/png/webp, max 5MB, client-side validation)
- "Remove Photo" button (only when avatar exists) → clears `avatar_url` and deletes old file
- Upload path: `avatars/{user.id}/avatar-{timestamp}.{ext}`, then `update profiles.avatar_url`
- Calls `refresh()` from `useAuth` so nav/messages/profile reflect change instantly

### 2. Basic Info
- Display name (`full_name`)
- Username with live availability check: debounced 400ms query `profiles.select(id).eq('username', value).neq('id', user.id)`; show ✓ available / ✗ taken / loading spinner
- Bio textarea with 250-char counter (red when over)
- Location
- Website URL (validated `https?://`)
- Languages — chip input (comma to add, click to remove)

### 3. Credentials & Expertise
- Skills tags — reuse `SkillsTagInput` component, max 10
- Years of experience — Select dropdown (0-1, 1-3, 3-5, 5-10, 10+)
- Certifications — repeating rows of {name, org, year} with Add/Remove
- Portfolio links — up to 5 rows of {label, url} with Add/Remove
- "Verify Me" CTA card → links to existing `/seller/verification` page (already handles ID upload + admin review). Shows current verification status pulled from `get_seller_verification_status` RPC; renders "Verified Expert" badge when status = `verified`

### 4. Sticky Save Bar
- Fixed bottom bar appearing only when form is dirty (compare against initial snapshot)
- Single "Save changes" button: states idle → "Saving…" → "Saved ✓" (auto-revert after 2s)
- Single `supabase.from('profiles').update(payload).eq('id', user.id)` call
- On success: call `refresh()` and reset dirty baseline; no page reload
- "Discard" button reverts to baseline

## Technical notes
- Use `zod` for client-side validation (URL, bio length, username pattern `^[a-z0-9_]{3,30}$`)
- Username uniqueness handled by the unique index — surface DB error gracefully if race
- Keep `Security` (password) and `Preferences` sections from current Settings page below the new editor
- File size check before upload; toast error if >5MB or wrong mime

## Files to change
- `supabase/migrations/<new>.sql` — add 3 columns
- `src/pages/account/Settings.tsx` — full rewrite
- `src/components/account/AvatarUploader.tsx` — new
- `src/components/account/UsernameField.tsx` — new (debounced availability)
- `src/components/account/CertificationsEditor.tsx` — new
- `src/components/account/PortfolioLinksEditor.tsx` — new
- `src/components/account/StickySaveBar.tsx` — new
