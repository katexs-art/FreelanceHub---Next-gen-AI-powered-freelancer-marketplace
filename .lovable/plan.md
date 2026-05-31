## Scope

Visual + copy fixes for `/post-job` (`src/pages/PostJob.tsx`) and removal of one duplicate nav link in `src/components/layout/SiteHeader.tsx`. No functionality, routing, schema, or submission logic changes.

## 1. SiteHeader — remove duplicate "Projects"

The default header currently renders two "Projects" links: `/projects` (line 129) and `/buyer/orders` (line 136). Keep only `/projects`. Remove the `/buyer/orders` "Projects" link from the authed block; leave the `/inbox` "Messages" link intact.

Final nav order (authed): Find Experts · How It Works · Sell (non-sellers) · Projects · Post a Project (clients) · Messages · search · HQ · Sign out.

## 2. PostJob page rewrite

Rewrite `src/pages/PostJob.tsx` keeping all state, handlers, supabase calls, validation, and navigation identical. Only markup, copy, and styles change.

### Container
- White page (`bg-white`), max-width 720px, centered, padding `48px 24px`.

### Header
- Single H1 "Post a Project" — 32px / 600 / `#0A0A0A`, `margin-bottom: 8px`.
- Subtext: "Describe what you need — top Experts will submit Proposals within hours" — 15px / `#666`, `margin-bottom: 40px`.
- Remove the second "Post a Project" heading.

### Shared field styles (inline)
- Label: `13px / 600 / #333`, `display:block`, `margin-bottom:8px`.
- Input/select/date base: `width:100%`, `bg:#fff`, `border:1.5px solid #CCC`, `radius:12px`, `font:15px`, `color:#0A0A0A`, placeholder `#AAA`.
- Text/date/select height: 52px, padding `0 16px`.
- Textarea: padding `14px 16px`, `min-height:140px`, `resize:vertical`.
- Select: `appearance:none`, chevron SVG as background, `right 16px center`.
- Focus (via onFocus/onBlur inline style swap, or a tiny `<style>` block scoped by className `pj-field` to set `:focus { border-color:#0A0A0A; box-shadow:0 0 0 3px rgba(0,0,0,0.06); }`).

### Fields (in order, all native `<input>/<textarea>/<select>` to avoid touching shared UI components)
1. **Project Title** — placeholder "Example: Build me a Voice AI caller for my real estate business".
2. **Describe your project** — textarea, placeholder "Tell Experts exactly what you need. Include your goals, tools you use, what you want delivered, and any specific requirements. The more detail you give the better Proposals you will receive."
3. **Service Category** — styled select, options from `useCategories()` (unchanged).
4. **Required Skills** — tag input, placeholder "Type a skill and press Enter — example: Voice AI, GoHighLevel, Chatbot". Chips below unchanged behavior, restyled to match (`#F7F7F7` pill, 12px radius border `#EBEBEB`).
5. **Your Budget** — two side-by-side inputs (`grid-cols-2 gap-3`), placeholders "Min $" / "Max $", styled per spec.
6. **Delivery Deadline** — date input, 52px.
7. **Attachments (optional)** — dashed dropzone: `border:2px dashed #CCC`, radius 12, padding 32, centered, text `#888` 14px: "Drag files here or click to upload. Accepts PDF, images, and documents." Clicking the area triggers the hidden `<input type="file" multiple>`. Keep existing `handleFiles` logic and `attachments.length` indicator.
8. **Who can submit a Proposal?** — two pill cards side by side (`grid-cols-2 gap-3`):
   - "Open to all Experts" / "Any approved Expert can submit a Proposal" → sets `visibility="open"`.
   - "River matched only" / "Only River's top matches get notified" → sets `visibility="river"`.
   - Card: `border:1.5px solid #CCC`, radius 12, padding 16, cursor pointer. Selected: `border-color:#0A0A0A`, `bg:#F7F7F7`. Hidden radio inputs maintain accessibility.

### Submit
- Button "Post My Project" — full width, `bg:#0A0A0A`, `color:#fff`, radius 12, height 56, `font:16/600`, hover `#333`, `margin-top:32px`. Disabled state keeps current opacity behavior, label "Posting…" preserved.
- Trust line below: 12px `#AAA` centered, `margin-top:12px`: "Free to post · Experts will be notified immediately · You only pay when you accept a Proposal".

### Copy rules applied
Throughout the page: "sellers" → "Experts", "bid/bids" → "Proposal/Proposals", "job" → "Project". Validation toast messages, page meta, and any helper text updated accordingly. No changes to error strings returned by Supabase.

## Out of scope
- No DB / RLS / edge function / route changes.
- No edits to shared UI primitives (`Input`, `Textarea`, `Button`) — styles applied inline on this page only.
- No other pages touched.
