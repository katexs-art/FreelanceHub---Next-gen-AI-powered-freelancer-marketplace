## Add Appearance theme picker to Settings

### 1. Database migration
Add column to `profiles`:
- `theme_preference text default 'clean-white'` (allowed: clean-white, midnight, ocean, forest, sunset, purple-haze)

### 2. Theme tokens (src/index.css)
Add scoped theme classes that override sidebar + dashboard surface variables. Each lives under `.kx-theme-<name>` so it only affects elements inside the AppShell wrapper, not public pages.

```css
.kx-theme-midnight {
  --background: 0 0% 4%; --foreground: 0 0% 100%;
  --sidebar-background: 0 0% 4%; --sidebar-foreground: 0 0% 100%;
  --sidebar-border: 0 0% 14%; --sidebar-accent: 0 0% 10%;
  --border: 0 0% 16%; --card: 0 0% 7%; ...
  --primary: 142 71% 36%;  /* keep green */
}
.kx-theme-ocean   { --primary: 217 91% 53%;  --sidebar-primary: 217 91% 53%; --ring: 217 91% 53%; }
.kx-theme-forest  { --primary: 160 84% 31%;  --sidebar-primary: 160 84% 31%; --ring: 160 84% 31%; }
.kx-theme-sunset  { --primary: 21 90% 48%;   --sidebar-primary: 21 90% 48%;  --ring: 21 90% 48%; }
.kx-theme-purple  { --primary: 262 83% 58%;  --sidebar-primary: 262 83% 58%; --ring: 262 83% 58%; }
/* clean-white = no class (root defaults) */
```

### 3. Theme provider
New `src/hooks/useTheme.ts`:
- Reads `theme_preference` from `useAuth().profile` on mount.
- Exposes `{ theme, setTheme(persist), preview(name), clearPreview() }`.
- Persists via `supabase.from('profiles').update({ theme_preference })`.
- Stores last-applied in `localStorage` so it loads instantly before profile fetch.

### 4. AppShell integration
In `src/components/layout/AppShell.tsx`, wrap root `<div>` with `className={cn("min-h-screen bg-background", \`kx-theme-${effectiveTheme}\`)}` where `effectiveTheme = preview ?? saved`. Only the AppShell — public pages (Landing, Services, GigDetail, etc.) stay default.

### 5. Settings page — tabs
Refactor `src/pages/account/Settings.tsx`:
- Wrap existing content in a `Tabs` component (shadcn) with two tabs: **Profile** (current content) and **Appearance** (new).
- Default tab respects `?tab=` query param.

### 6. Appearance tab component
New `src/components/settings/AppearanceTab.tsx`:
- Heading "Make Katexs yours" + sub "Choose a theme for your dashboard".
- Grid of 6 `ThemeCard`s (3 cols desktop, 2 mobile).
- Each card: 200×140 mini preview with rendered sidebar bar (28px wide left band in theme bg/border) + chat bubble (rounded pill in theme primary) + a content line. Name below + checkmark badge top-right when active.
- `onMouseEnter` → `preview(name)`, `onMouseLeave` → `clearPreview()`, `onClick` → `setTheme(name)` (saves to DB, toast "Theme applied").

### 7. Verification
- Visit `/settings?tab=appearance`, hover each card → AppShell background changes.
- Click → persists; reload keeps theme.
- Visit `/` (Landing) → unaffected.
- Visit `/inbox`, `/seller/dashboard`, `/buyer/dashboard`, `/projects` (AppShell wrapped) → theme applies.

### Files
- `supabase/migrations/<new>.sql` — add `theme_preference` column
- `src/index.css` — add 5 theme override blocks
- `src/hooks/useTheme.ts` — new
- `src/components/layout/AppShell.tsx` — wrap with theme class
- `src/pages/account/Settings.tsx` — add Tabs
- `src/components/settings/AppearanceTab.tsx` — new
- `src/components/settings/ThemeCard.tsx` — new
