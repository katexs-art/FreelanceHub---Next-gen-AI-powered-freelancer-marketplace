## Goal

Move off seller-side Stripe Connect onboarding. The **platform's Stripe account** handles all charges and refunds (like Fiverr). Sellers only need to tell us where to send their money — Stripe bank transfer (Connect transfer under the hood, no onboarding UI) or PayPal email. Refunds fire automatically when both parties agree to cancel.

## What changes for users

**Buyers**
- Pay with card on Checkout, exactly as today.
- If both they and the seller agree to cancel an order before delivery → refund hits their card automatically within minutes.
- Disputes still go to admin for manual decision.

**Sellers**
- No more "Connect with Stripe" onboarding screen.
- A new **Payout method** card on the Earnings page:
  - Choose **Bank transfer (Stripe)** → enter country + bank/IBAN details in a single form. We create a Stripe recipient behind the scenes.
  - Or choose **PayPal** → enter PayPal email.
- Can publish gigs immediately (no payout-gating). Withdrawals are still blocked until a payout method exists.

**Admin**
- Withdrawal queue: one **Pay out** button per request. We route to Stripe transfer or mark "PayPal — pending manual send" depending on the seller's chosen method.
- Disputes page unchanged; resolving a dispute in buyer's favor triggers a refund.

## Technical plan

### Database (single migration)
- `seller_accounts`: add `payout_method text check in ('stripe_bank','paypal')`, `paypal_email text`, `bank_country text`, `bank_last4 text`. Keep `stripe_account_id` (still used as the transfer destination for the bank option).
- `orders`: add `refunded_at timestamptz`, `refund_id text`, `stripe_charge_id text`.
- `withdrawals`: add `method text`, `failure_reason text`.

### Edge functions
- **`stripe-checkout`** — remove the `payouts_enabled` gate. Buyers can always pay.
- **`stripe-webhook`** — on `checkout.session.completed`, capture `charge_id` onto the order. Add handler for `charge.refunded` → mark order `cancelled`, set `refunded_at`, insert reversing transactions, recompute balance.
- **`stripe-refund`** (new) — called by admin (disputes) or by the mutual-cancel path. Calls `stripe.refunds.create({ charge })`.
- **`payout-method-save`** (new) — accepts `{ method, paypal_email? , bank_token? }`. For `stripe_bank` it creates/updates a Stripe **Custom** connected account using a tokenized external account (no onboarding link, just the bank form posts a token to Stripe.js). Persists method on `seller_accounts`.
- **`stripe-payout`** — branch on `payout_method`: `stripe_bank` → existing transfer flow; `paypal` → set withdrawal `status='processing'` and note "manual PayPal send required" (admin completes outside Stripe, then marks paid).
- Delete `stripe-connect-onboard` and `stripe-connect-status` (no longer used).

### DB function
- New `request_mutual_cancel(_order_id)` and update `cancellation_requests` flow: when both parties have agreed (or seller approves a buyer request before delivery), call edge `stripe-refund` from a trigger via `pg_net`, or simpler — the client invokes `stripe-refund` right after the approving update. Go with the client-invokes path for simplicity.

### Frontend
- **`src/pages/seller/Earnings.tsx`**: replace the Stripe Connect onboarding banner with a **Payout method** card (radio: Bank transfer / PayPal, conditional fields, Stripe.js for bank tokenization). Withdraw button enabled when `payout_method` is set.
- **`src/pages/seller/GigEditor.tsx`**: remove the `payouts_enabled` warning + submit gate.
- **`src/pages/orders/OrderWorkspace.tsx`** (cancellation flow): when the second party accepts a cancellation on an unfulfilled order, call `stripe-refund` and toast "Refund issued".
- **`src/pages/admin/Admin.tsx`**: in withdrawal queue, show the seller's payout method as a badge; "Pay out" button calls `stripe-payout` either way (PayPal branch just flags it for manual completion + offers a "Mark paid" action).

### Out of scope
- Building a full PayPal Payouts API integration. We capture the email and admin sends manually. Can be upgraded later.
- KYC for sellers — relying on Stripe's lightweight recipient-only account for bank transfers.
