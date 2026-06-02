# Fix Send offer button overlapping username in Inbox header

## Problem
In `src/pages/Inbox.tsx`, the chat header's left flex group has a name row (truncated) and a status/username row beneath it. The status row (line 550) is `display: flex` without `overflow: hidden` / `textOverflow: ellipsis` / `whiteSpace: nowrap`, so long `@usernames` and "Last seen …" strings overflow their flex container and visually slide under the right-side action group (Send offer, video, more), producing the overlap shown in the screenshot.

## Change
Single file: `src/pages/Inbox.tsx`

1. Add `overflow: "hidden"` to the inner name/status wrapper (the `<div style={{ minWidth: 0, flex: 1 }}>` at ~line 546) so any overflowing child is clipped within its allocated width.
2. On the status row (~line 550), add `minWidth: 0`, `overflow: "hidden"`, `whiteSpace: "nowrap"`, and `textOverflow: "ellipsis"` so the `@username` / "Last seen …" / inner `<Link>` text truncates with an ellipsis instead of bleeding past the column.
3. Keep all existing colors, spacing, and the right-side action group untouched.

No business logic, data, or other components are affected.
