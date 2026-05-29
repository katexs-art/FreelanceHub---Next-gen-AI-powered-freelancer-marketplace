# Fix custom offer notification enum error

## Root cause

The `notify_on_custom_offer` database trigger inserts notifications with type `'offer'::notification_type`, but the `notification_type` enum has no `offer` value. The valid value is `custom_offer`.

Valid enum values: `order_placed, requirements_submitted, order_delivered, order_completed, revision_requested, review_received, custom_offer, message, dispute, payout, system`.

No client code inserts these directly — `custom_offers` insert fires the trigger, which fails.

## Change

Migration replacing `public.notify_on_custom_offer()` so both branches use `'custom_offer'::notification_type` instead of `'offer'`. Function body otherwise unchanged.

## Heads-up (not in this fix)

Several other triggers reference enum values that also don't exist (`'order'` in `notify_on_dispute`, `notify_on_order_status`, `notify_on_cancellation`, `notify_on_delivery`). Those will fail the same way when triggered. Let me know if you want them fixed in the same pass.
