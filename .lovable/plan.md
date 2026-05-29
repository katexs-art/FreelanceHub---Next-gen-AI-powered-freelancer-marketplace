**File:** `src/pages/Landing.tsx`

Replace the hero "ASK" search pill and the "Popular chips" block (lines 101–131) with the River AI search form (POWERED BY RIVER AI eyebrow + "Tell River what you need…" input + "Find My Expert" button, submitting to `/river-results?q=...`).

Also remove the now-duplicate `<RiverAISearch />` section below the hero (lines 136–137) and delete its unused component definition at the bottom of the file, plus the unused `ROTATING`, `POPULAR`, `phIdx` state, and `Command`/`ArrowRight` imports if no longer referenced.

No other pages, colors, fonts, or layout change.