## Revert to light theme with green accent

Switch the global theme from the current dark monochrome back to the Fiverr-style light palette shown in the screenshot:

- **Background:** white / light gray (`#ffffff`, subtle `#f5f5f5`)
- **Foreground:** near-black (`#1a1a1a`) with muted gray (`#6b7280`)
- **Primary accent:** Fiverr green (`#1dbf73` / hover `#19a463`)
- **Borders:** light gray (`#e5e7eb`)

### Changes
1. **`src/index.css`** — replace the `:root` HSL tokens (background, foreground, primary, border, muted, card, popover, sidebar) with the light palette above. Remove/override the `.dark` defaults so the app renders light by default.
2. **No component edits needed** — all surfaces use semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, etc.), so swapping tokens cascades everywhere (landing, header, search, gig cards, dashboards, admin).
3. **Leave typography, spacing, radii, and layout untouched** — only colors change.

### Out of scope
- No structural/layout changes
- No logo change (katexs. stays as-is)
- No per-component restyling

### Note on memory
The project memory currently pins "Minimalist dark (#020203 bg, #f8f7f4 text). Absolutely no gradients…". After you approve, I'll update `mem://style/visual-identity` and the index Core line to reflect the new light + green direction so future changes stay consistent.
