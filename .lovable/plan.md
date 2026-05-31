# Smart Required Skills tag input

Replace only the Required Skills field on `src/pages/PostJob.tsx` (lines ~270–303). Nothing else on the site changes.

## New component

Create `src/components/postjob/SkillsTagInput.tsx` (scoped to Post a Project) that owns the visual tag-input + suggestions dropdown. Submission still uses the existing `skills` array state in `PostJob.tsx`, which already flows to `skills_required` in `project_posts`.

Props: `value: string[]`, `onChange: (v: string[]) => void`, `max = 6`.

### Catalog
Hard-coded constant `SKILL_CATALOG` with the 51 skills from the spec (Voice AI … DevOps).

### Behavior
- Internal `query` state for the typed text.
- Matching: case-insensitive `includes` against catalog, excluding already-selected skills, take first 6.
- Add tag on: suggestion click, custom-row click, or Enter on non-empty trimmed query. De-dupe case-insensitively, keep original casing of catalog match when possible.
- Remove tag via the X on each pill.
- When `value.length >= 6`: hide input + dropdown, show helper "Maximum 6 skills reached".
- Dropdown only renders when input is focused and query is non-empty. Hide on blur with a small timeout so suggestion clicks register (use `onMouseDown` on rows to fire before blur).
- Keyboard: Enter adds custom/typed; Escape clears query; Backspace on empty query removes last tag.

### Styling (inline styles, matches spec exactly)
- Label: 13px / 600 / #333, mb 8.
- Helper above container: 12px / #AAA, mb 10, text "Add up to 6 skills. Type to search or enter your own."
- Container: white bg, 1.5px solid #CCC, radius 12, padding 10px 14px, min-height 52, flex wrap, gap 8, items center. Focus state swaps border to #0A0A0A (track via `focusedWithin` state, since :focus-within can't be inlined — alternative: a tiny `<style>` block scoped via a unique className).
- Pill: bg #0A0A0A, color #fff, 12px / 500, padding 4px 12px, radius 999, inline-flex, gap 6. X button color #888 hover #fff.
- Inner input: borderless, transparent bg, outline none, flex 1, min-width 120, placeholder "Type a skill..." in #AAA.
- Dropdown: absolute, white, 1px solid #EBEBEB, radius 12, shadow `0 4px 16px rgba(0,0,0,0.08)`, max-height 220, overflow-y auto, z-index 50, mt 6. Wrap container in `position: relative`.
- Suggestion row: padding 10px 16px, cursor pointer, hover bg #F7F7F7, text 14px #0A0A0A.
- Empty-match row: "Add \"[typed text]\" as a custom skill", 13px #666, padding 10px 16px, cursor pointer.

For the focus border + hover backgrounds (which need pseudo-classes), inject a small scoped `<style>` block inside the component using a unique class prefix `kx-skills-…`.

## PostJob.tsx changes
- Import `SkillsTagInput`.
- Remove `skillInput` state, `addSkill` handler, and the existing input+pill JSX block (lines ~270–303).
- Render `<SkillsTagInput value={skills} onChange={setSkills} />` in its place.
- Leave the existing `skills` state, validation, and submit payload (`skills_required: skills`) untouched.

## Out of scope
- No DB migration; the column already accepts an array/CSV.
- No changes to any other field, page, route, style token, or component.
