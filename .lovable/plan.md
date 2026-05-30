# Platform Audit & Hardening Plan

A full audit of a marketplace this size (28+ tables, 15+ edge functions, Stripe escrow, AI flows, messaging, disputes, admin) is a multi-pass engagement, not a single tool run. Below is how I'll structure it so nothing gets skipped and every finding ends with either a fix or a documented recommendation.

## Phase 1 — Static audit (read-only, no code changes)

1. **Database & RLS review**
   - Re-read every policy on all 30+ public tables; flag overly-permissive `USING true`, missing `WITH CHECK`, anon exposure, and tables relying on client-set `user_id`.
   - Verify `GRANT`s match policy intent on every table.
   - Run `supabase--linter` and `supabase--db_health`.
   - Audit SECURITY DEFINER functions for `search_path`, privilege escalation, and input validation.
   - Check sensitive PII columns (email, phone, KYC) for read exposure.

2. **Edge function review** (all 20+ functions)
   - JWT verification, CORS, input validation (Zod), error handling, rate limiting.
   - Stripe webhook signature enforcement, idempotency, race conditions on order creation.
   - `river-ops-chat`, `river-chat`, `ai-search`: prompt-injection surface, cost controls.
   - Secret usage and least-privilege service role usage.

3. **Frontend auth & route guards**
   - `ProtectedRoute` role enforcement, admin-only routes, redirect loops.
   - Client-side checks that should be server-enforced.
   - Realtime subscriptions and RLS interaction.

4. **Payments & escrow integrity**
   - Stripe checkout → webhook → order → transaction → withdrawal chain.
   - Refund reversal math, dispute-hold logic, auto-complete cron, Connect transfers.
   - Idempotency of `checkout.session.completed` vs `payment_intent.succeeded` (currently both create transactions — possible double-credit).

5. **Notification, messaging, review pipelines**
   - Trigger correctness, duplicate notifications, review visibility gating, response-stats recompute cost.

## Phase 2 — Dynamic testing

- Use `supabase--curl_edge_functions` to exercise each function with valid, invalid, unauthorized, and adversarial inputs.
- Use `supabase--analytics_query` to inspect recent edge/DB logs for silent errors.
- Browser tool: walk the buyer journey (browse → River search → checkout → requirements → delivery → review) and the seller journey (signup → onboarding → gig create → order → deliver → withdraw).
- Sample-query the DB for orphan rows, negative balances, stuck `pending_payment` orders, expired promotions still active.

## Phase 3 — Categorized findings report

Each finding will include: severity, file/table, root cause, reproduction, recommended fix, and whether I auto-fixed it.

Severity tiers:
- **P0** Security / money / data loss
- **P1** Broken core flow
- **P2** Reliability / scalability risk
- **P3** UX / polish

## Phase 4 — Fixes (build mode)

I will fix P0 and P1 issues directly. P2/P3 will be listed with recommended migrations or refactors so you can prioritize. Anything touching money or schema will be a single reviewable migration.

## Phase 5 — Scalability & architecture recommendations

Covering: read replicas / instance sizing, indexing gaps, N+1 queries, virtualization on long lists, edge function cold starts, Stripe Connect vs current dual-flow, observability (logs/metrics/alerts), background job runner vs cron functions, secret rotation, backup/restore drills, abuse rate-limiting, and a path to SOC2-readiness.

---

## What I need from you before starting

Because the scope is large and some areas are destructive to probe, please confirm:

1. **Scope of fixes during this pass** — fix P0/P1 immediately, or audit-only and you review fixes first?
2. **Test data permission** — may I create test buyer/seller accounts, place a $1 test order via Stripe test mode, and clean up after? (Required for true end-to-end payment validation.)
3. **Time budget** — a thorough pass will span many tool calls across several turns. Confirm you want depth over speed.
4. **Priority areas** — anything you already suspect (payments? River AI? admin?) that I should front-load.

Once you confirm, I'll switch to build mode and begin Phase 1, posting findings incrementally rather than waiting until the very end.
