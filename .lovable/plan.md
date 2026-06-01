## Root causes

1. **React hooks-order crash → blank white page.** `OrderWorkspace.tsx` calls `useState` for `disputeOpen` and `disputeReason` *after* the early `return` for loading/missing order. The first render registers 8 hooks, later renders register 10, React throws "Rendered more hooks than during previous render", and the whole route unmounts to a blank screen.
2. **Embedded foreign joins return no data.** The `orders` table has no foreign keys to `gigs` or `profiles`, so the query `gigs:gig_id(...)`, `buyer:buyer_id(...)`, `seller:seller_id(...)` fails inside PostgREST and `data` comes back null. Even without the hooks crash this would show "Project not found".
3. **No guard for orders with `gig_id = null`** (the test order `222ab2db…` has `gig_id = null` because it came from a custom offer / project bid). The current code blindly queries `gig_requirements.eq("gig_id", null)`.
4. **No error state.** When the query fails the user only sees "Project not found" with no diagnostic; we'll add a proper not-found / error block.

RLS on `orders` is already correct (`orders_party_read` allows buyer, seller, admin) — no migration needed.

## Fix plan — `src/pages/orders/OrderWorkspace.tsx` only

1. **Move all `useState` hooks to the top of the component**, above any early returns. This alone unblocks the blank page.
2. **Stop relying on embedded joins.** Fetch the order with only its own columns, then in parallel fetch:
   - `gigs` row by `gig_id` (skip if null)
   - `gig_packages` row by `package_id` (skip if null)
   - `profiles` rows for buyer_id and seller_id via `in("id", [...])`
   - `gig_requirements` only if `gig_id` is present
   - `order_deliveries` by `order_id`
   Compose them into the existing `order` shape so the rest of the JSX keeps working.
3. **Handle custom-offer / project orders (no gig).** Fall back to `order.project_title` for the title, hide the thumbnail, and skip the requirements section when there is no gig.
4. **Loading + error + not-found states.**
   - While fetching: existing "Loading…" stays.
   - On query error: show an "Unable to load order" card with the error message and a retry button.
   - When the query succeeds but returns no row (or RLS hides it from the current user): show a clear "Order not found" card with a link back to `/orders`.
5. **Keep all existing behavior** (timeline, deliveries, requirements, dispute flow, review, messaging button). No business-logic changes.

## Verification

- Load `/orders/222ab2db-627c-4d38-a3aa-d7eddd01c1c5` as the buyer or seller and confirm the page renders with status `pending_requirements`, the project title, both participants, amount, deadline, timeline, and the message-seller button.
- Visit a random UUID and confirm the "Order not found" card appears instead of a blank screen.
- Confirm no React hooks warning in the console.
