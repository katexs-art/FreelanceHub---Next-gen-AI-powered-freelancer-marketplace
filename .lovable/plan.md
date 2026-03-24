

# Deploy Workflow Engine Edge Function + Wire Test Button

## What We're Building
A real workflow execution engine as a backend function, plus the database tables it needs, and wiring the "Test" button to actually execute workflows against a selected contact.

## Database Changes (3 new tables)

**`workflow_runs`** — tracks each workflow execution
- `id`, `workflow_id`, `contact_id`, `user_id`, `status` (running/waiting/completed/failed), `trigger_data` (jsonb), `step_results` (jsonb), `steps_completed` (int), `current_step` (int), `wait_until` (timestamptz), `started_at`, `completed_at`, `updated_at`, `created_at`
- RLS: users can CRUD own runs

**`workflow_scheduled`** — queues delayed steps for resumption
- `id`, `workflow_id`, `run_id`, `contact_id`, `user_id`, `resume_step` (int), `scheduled_for` (timestamptz), `executed` (bool), `created_at`
- RLS: users can view/insert own scheduled items

**`error_logs`** — captures edge function errors
- `id`, `function_name`, `error_message`, `created_at`
- No RLS needed (service role only writes)

## Edge Function

**`supabase/functions/workflow-engine/index.ts`** — the code you provided, with one fix: adding CORS headers so the frontend can call it.

Two actions:
- `execute_workflow` — runs a specific workflow against a contact
- `trigger` — finds all active workflows matching a trigger type and executes them

## Secrets
Most secrets already exist. **SENDGRID_API_KEY** is referenced but not yet added — we'll add it (or gracefully skip email steps if not set).

## Frontend Changes

**`WorkflowBuilder.tsx`** — Update Test button to:
1. Show a contact picker dialog (select from user's contacts)
2. Call the `workflow-engine` edge function with `action: "execute_workflow"`
3. Show real results (success/failure per step)

**`WorkflowBuilder.tsx`** — Add a `TestContactPicker` modal component inline that fetches contacts and lets user pick one before executing.

## Technical Details

| File | Change |
|------|--------|
| Migration | Create `workflow_runs`, `workflow_scheduled`, `error_logs` tables with RLS |
| `supabase/functions/workflow-engine/index.ts` | Deploy the engine with CORS headers added |
| `src/components/workflows/WorkflowBuilder.tsx` | Wire Test button to call edge function with contact picker |

