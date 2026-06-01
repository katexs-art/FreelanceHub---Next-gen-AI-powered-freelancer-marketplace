## Goal
Move the two hero/explainer videos off the stale `lquoahkuzqwtiihshdaf` Supabase project onto Lovable's CDN, and update `Landing.tsx` and `HowItWorks.tsx` to use the resulting `.asset.json` pointers.

## Steps

1. **Download both videos from the old Supabase project** into `/tmp`:
   - `https://lquoahkuzqwtiihshdaf.supabase.co/storage/v1/object/public/katexs-assets/8835828-hd_1920_1080_25fps.mp4`
   - `https://lquoahkuzqwtiihshdaf.supabase.co/storage/v1/object/public/katexs-assets/7438233-uhd_4096_2160_25fps%20(1)%20(1)%20(1).mp4` (rename locally to a clean `landing-hero.mp4`)

2. **Upload each via `lovable-assets create`** with explicit `--filename`, writing the JSON output to:
   - `src/assets/howitworks-hero.mp4.asset.json`
   - `src/assets/landing-hero.mp4.asset.json`

3. **Verify uploads** by checking each `.asset.json` is valid JSON containing a `url` field.

4. **Update `src/pages/Landing.tsx`** — replace the hardcoded `lquoahkuzqwtiihshdaf` URL constant with an import of the new `.asset.json` and use `landingHero.url`.

5. **Update `src/pages/HowItWorks.tsx`** — same pattern with the HowItWorks asset.

6. **Verify** — confirm no remaining `lquoahkuzqwtiihshdaf` references in `src/` (only in `MIGRATION.md` / `scripts/migrate*` / `.lovable/plan.md`, which stay).

## Out of scope
- `MIGRATION.md`, `scripts/migrate.sh`, `scripts/migrate-auth-users.mjs`, `.lovable/plan.md` — left alone per your instruction.
- `.env`, `supabase/config.toml`, `src/integrations/supabase/client.ts` — already correctly pointing at `nswgubxabcjyfsgbiicz`.

## Risk
- The hero video is ~11 MB; the landing 4K video is likely larger. Upload should still complete via the CLI. If the CLI rejects a file for size, I'll stop and report back before changing the page imports.
