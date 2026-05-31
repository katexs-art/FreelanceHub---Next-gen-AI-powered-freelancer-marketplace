# Smart Category Search on Post a Project

Replace the `<select>` Service Category dropdown in `src/pages/PostJob.tsx` with a typeahead input. Only that one form field changes — everything else on the page (title, description, skills, budget, deadline, attachments, visibility, submit, header/footer, styles) stays exactly as it is.

## Behavior

- Single text input matching the brief's exact specs:
  - Label "Service Category" (13px / 600 / #333333 / 8px mb)
  - Input: white, 1.5px #CCCCCC, radius 12px, 52px tall, padding 0 16px, 15px / #0A0A0A, 100% width
  - Placeholder: `Type to search — example: Voice AI, GHL, Chatbot, Marketing...`
  - Focus border `#0A0A0A` (uses existing `onFocus` / `onBlur` helpers in the file)
- As user types, render a suggestion dropdown positioned absolutely under the input:
  - White, 1px #EBEBEB, radius 12px, shadow `0 4px 16px rgba(0,0,0,0.08)`, max-height 280px, scroll-y, z-50
  - Up to 8 case-insensitive matches against `categories.name` (substring)
  - Each row: padding 12px 16px, cursor pointer, hover #F7F7F7
    - Line 1: category name — 14px / 500 / #0A0A0A
    - Line 2 (only if it has a parent): parent category name — 11px / #AAAAAA
  - Empty state row: `No category found — your project will be reviewed by our team` (13px / #AAAAAA / padding 12px 16px)
- Click a suggestion: input value = category name, dropdown closes, the category **slug** is stored in a hidden state field (`categorySlug`).
- Free typing without selecting is allowed — on submit, if no slug was chosen, the typed text becomes the category value.
- Dropdown closes on outside click (mousedown listener on `document`) and on blur with a small delay so clicks register.

## Submit wiring

In the existing `submit` handler, change the inserted `category` field from `category || null` to `categorySlug || categoryText.trim() || null`. No other DB or routing changes.

## State changes inside `PostJob.tsx`

- Replace `const [category, setCategory] = useState("")` with:
  - `categoryText` (visible input value)
  - `categorySlug` (resolved slug from a clicked suggestion; cleared when the user edits the text after selecting)
  - `categoryOpen` (dropdown visibility)
- Remove the `<select>` JSX and `selectStyle` usage for this field (keep `selectStyle` const — harmless, but will remove since it has no other consumer).
- Keep `useCategories()` import — it already returns parent + child rows with `parent_id`, which is exactly what's needed to render the parent label.

## Out of scope

No changes to other fields, routes, DB schema, RLS, `useCategories`, header, footer, or any other page.
