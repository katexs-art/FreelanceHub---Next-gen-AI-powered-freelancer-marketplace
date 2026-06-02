ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS portfolio_links jsonb NOT NULL DEFAULT '[]'::jsonb;