## 1. Sidebar — show all nav items on every dashboard page

Edit `src/components/layout/AppShell.tsx`:

- Replace the role-split `sellerLinks` / `buyerLinks` with a single unified list shown to every authenticated user:
  - HQ → `/hq`
  - Projects → `/buyer/orders` (buyer) or `/seller/orders` (seller); for buyers we still show the "Projects" entry
  - Saved → `/saved`
  - Find experts → `/services`
  - Messages → `/inbox`
  - Settings → `/settings`
- Sellers keep their extra entries (My services, Earnings, Analytics, Verification) appended below the shared block, so nothing seller-specific is lost.
- Order: HQ · Projects · Saved · Find experts · (seller extras) · divider · Messages · Settings.

## 2. Theme switcher actually applies

Root cause: `kx-theme-*` class is set on a div inside `AppShell`, but `<body>` / `<html>` still use the default `:root` tokens, and any portal content (Radix popovers, dialogs, toasts) renders outside that div so it never sees the override. The theme also isn't applied on routes that don't use `AppShell`.

Changes:

- **New `src/components/ThemeProvider.tsx`**
  - Mounts once at the app root (wrap `<App />` children in `src/App.tsx`, inside `AuthProvider`).
  - Subscribes to `useTheme()` and writes:
    - `document.documentElement.dataset.theme = theme` (e.g. `data-theme="midnight"`)
    - toggles `kx-theme-<id>` class on `document.documentElement`
  - Removes stale `kx-theme-*` classes before adding the new one.
  - On mount, reads `localStorage["kx-theme"]` and applies immediately to avoid a flash; profile sync (already in `useTheme`) updates it after auth loads.

- **`src/index.css`**
  - Duplicate each `.kx-theme-*` block as `[data-theme="..."]` so tokens apply regardless of whether the class lands on `<html>` or a wrapper. Keep the existing class selectors for backwards compatibility.
  - Add `--bg-primary`, `--bg-secondary`, `--accent`, `--text-primary` aliases mapped to existing tokens (`--background`, `--background-subtle`, `--primary`, `--foreground`) inside `:root` and each theme block, so the names from the spec exist.
  - Ensure the `midnight` block also overrides `--background-subtle`, `--sidebar-background`, `--card`, etc. (already present) — verify nothing is missing.

- **`src/components/layout/AppShell.tsx`**
  - Remove the local `kx-theme-${theme}` class from the wrapper div (now handled globally on `<html>`). Keep the `bg-background` so it picks up the cascaded tokens.

- **`src/hooks/useTheme.ts`**
  - No API change; the existing `setTheme` already persists to `localStorage` and `profiles.theme_preference`. ThemeProvider just reacts to its store.

### Verification

- Click Midnight in Appearance → `<html data-theme="midnight" class="kx-theme-midnight">`, sidebar + main + header instantly dark.
- Click Ocean → tokens flip to blue accent on the same page without reload.
- Reload `/settings` → still on chosen theme (localStorage hydrate before paint).
- Login on another device → profile `theme_preference` syncs.

## Out of scope

No DB changes (column already exists), no changes to widgets, settings form, or recommendations rail.