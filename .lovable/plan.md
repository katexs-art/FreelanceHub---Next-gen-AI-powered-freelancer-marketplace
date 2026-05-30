## Goal
Preserve a seller's progress through the 5-step `/seller-onboarding` flow if they refresh, close the tab, or navigate away before submitting.

## Approach
Use `localStorage` (per-user key) for autosave. No backend changes — keeps scope tight, works offline, instant restore, and avoids partial rows in `seller_applications`. The draft is cleared on successful submission.

## Changes (single file: `src/pages/SellerOnboarding.tsx`)

1. **Storage key**: `katexs:seller-onboarding-draft:{user.id}` so drafts are scoped per account.

2. **Restore on mount**: After `user` loads, read the key and hydrate `step`, `fullName`, `avatarUrl`, `bio`, `location`, `language`, `skills`, `primaryCat`, `secondaryCat`, `experience`, and `packages`. Profile defaults only apply when no draft exists (so a draft doesn't get overwritten by the profile-prefill effect).

3. **Autosave on change**: A single `useEffect` that depends on every form field writes the serialized state to localStorage. Debounce with a 400ms timeout to avoid thrashing on each keystroke. Skip writes until restore has completed (guarded by a `hydrated` ref) so we don't clobber the saved draft with empty defaults on first render.

4. **Subtle status indicator**: Small "Saved" / "Saving…" text near the progress bar (uses existing `text-foreground-muted` token — no new colors). Updates from the same effect.

5. **Clear on submit**: After `submit()` succeeds, `localStorage.removeItem(key)` before navigating to `/seller/dashboard`. Also clear if the user reaches the dashboard already approved/pending (the existing `Navigate` guards) — handled by a small cleanup on those redirect paths.

6. **Optional "Start over" link**: Tiny ghost button next to the saved indicator that clears the draft and resets state to empty. Only shown when a draft is detected.

## Out of scope
- No DB schema change, no new RPC, no edge function.
- Avatar uploads already persist to storage; only the resulting URL is saved in the draft.
- No styling, color, font, or layout changes elsewhere in the app.
