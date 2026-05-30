// Scheduled job — sends 50%, 24h, and "late" reminders for active orders.
// Invoked every 15 minutes by pg_cron. No JWT required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const ACTIVE = ["pending_requirements", "active", "revision_requested"];

  const { data: orders, error } = await admin
    .from("orders")
    .select("id, status, buyer_id, seller_id, created_at, delivery_deadline, delivered_at, reminder_halfway_sent_at, reminder_24h_sent_at, reminder_late_sent_at, order_number")
    .in("status", ACTIVE)
    .not("delivery_deadline", "is", null)
    .limit(500);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let fired = 0;
  for (const o of orders ?? []) {
    const start = new Date(o.created_at).getTime();
    const end = new Date(o.delivery_deadline!).getTime();
    const half = start + (end - start) / 2;
    const dayBefore = end - 24 * 3600_000;
    const notifs: any[] = [];
    const patch: Record<string, string> = {};

    if (!o.reminder_halfway_sent_at && now >= half && now < end) {
      notifs.push({ user_id: o.seller_id, type: "order", title: "Reminder — you are halfway through your delivery window. Stay on track.", link: `/orders/${o.id}` });
      patch.reminder_halfway_sent_at = new Date().toISOString();
    }
    if (!o.reminder_24h_sent_at && now >= dayBefore && now < end) {
      notifs.push(
        { user_id: o.buyer_id, type: "order", title: "Delivery deadline is in 24 hours.", link: `/orders/${o.id}` },
        { user_id: o.seller_id, type: "order", title: "Delivery deadline is in 24 hours.", link: `/orders/${o.id}` },
      );
      patch.reminder_24h_sent_at = new Date().toISOString();
    }
    if (!o.reminder_late_sent_at && now > end && !o.delivered_at) {
      notifs.push(
        { user_id: o.buyer_id, type: "order", title: "Your delivery is overdue — we are following up with your seller.", link: `/orders/${o.id}` },
        { user_id: o.seller_id, type: "order", title: "Your delivery is overdue — submit your work immediately to avoid a dispute.", link: `/orders/${o.id}` },
      );
      patch.reminder_late_sent_at = new Date().toISOString();
      (patch as any).status = "late";
    }

    if (notifs.length) {
      await admin.from("notifications").insert(notifs);
      await admin.from("orders").update(patch).eq("id", o.id);
      fired += notifs.length;
    }
  }

  return new Response(JSON.stringify({ checked: orders?.length ?? 0, fired }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
