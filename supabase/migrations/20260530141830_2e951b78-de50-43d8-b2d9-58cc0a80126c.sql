-- Restore full column access for authenticated; only restrict anon from PII.
GRANT SELECT ON public.profiles TO authenticated;

-- Anon keeps only the marketplace-safe column set granted in the prior migration.
-- (Re-state for clarity / idempotency)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, full_name, username, avatar_url, role, bio, languages,
  member_since, is_online, last_seen, response_time_minutes, response_rate,
  river_score, average_rating, total_reviews, seller_status,
  seller_skills, primary_category, secondary_category, portfolio_urls,
  location, suspended_at, created_at, updated_at
) ON public.profiles TO anon;
