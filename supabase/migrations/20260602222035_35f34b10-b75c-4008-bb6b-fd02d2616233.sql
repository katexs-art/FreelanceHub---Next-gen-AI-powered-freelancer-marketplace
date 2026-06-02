CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: remove existing jobs of the same names if present
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('clear-funds','auto-complete-orders');
END $$;

SELECT cron.schedule(
  'clear-funds',
  '0 * * * *',
  $$ SELECT public.clear_due_seller_credits(); $$
);

SELECT cron.schedule(
  'auto-complete-orders',
  '0 * * * *',
  $$ SELECT public.auto_complete_orders(); $$
);