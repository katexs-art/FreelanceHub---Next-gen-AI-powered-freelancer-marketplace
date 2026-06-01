// Sends transactional emails via Resend (through the Lovable connector gateway).
// Branded as "katexs ai". No marketplace/freelancer terminology.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Template =
  | "project_created"
  | "project_delivered"
  | "project_approved"
  | "project_cancelled"
  | "expert_approved"
  | "welcome_client"
  | "welcome_expert"
  | "order_placed"
  | "order_delivered"
  | "order_completed"
  | "order_refunded"
  | "new_message";

interface Payload {
  template: Template;
  to: string;
  data?: Record<string, any>;
}

const BRAND = "katexs ai";
const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://katexs.com";
const FROM_EMAIL = "noreply@kate-xs.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function shell(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #EBEBEB;border-radius:16px;padding:40px;">
        <tr><td>
          <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:#0a0a0a;margin-bottom:32px;letter-spacing:-0.01em;">katexs<span style="color:#16A34A;">.</span></div>
          <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#0a0a0a;letter-spacing:-0.01em;">${title}</h1>
          <div style="font-size:14px;line-height:1.6;color:#404040;margin-bottom:28px;">${body}</div>
          ${cta ? `<a href="${cta.href}" style="display:inline-block;background:#16A34A;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:13px;">${cta.label}</a>` : ""}
          <div style="margin-top:40px;padding-top:24px;border-top:1px solid #EBEBEB;font-size:11px;color:#888;">Sent by ${BRAND}</div>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function render(t: Template, d: Record<string, any> = {}): { subject: string; html: string } {
  const projectUrl = d.project_id ? `${APP_URL}/project/${d.project_id}` : APP_URL;
  switch (t) {
    case "project_created":
      return {
        subject: `New project: ${d.title ?? "Untitled"}`,
        html: shell(
          d.is_expert ? "You have a new project" : "Your project is booked",
          d.is_expert
            ? `<b>${d.client_name ?? "A client"}</b> just hired you for <b>${d.title ?? "a project"}</b> ($${d.price}). Open the project room to greet them and confirm scope.`
            : `Payment received. <b>${d.expert_name ?? "Your expert"}</b> has been notified and will get started. Open the project room to share details and chat.`,
          { href: projectUrl, label: "Open project room" },
        ),
      };
    case "project_delivered":
      return {
        subject: `Project delivered: ${d.title ?? ""}`,
        html: shell(
          "Your project has been delivered",
          `<b>${d.expert_name ?? "Your expert"}</b> marked your project as delivered. Review the work and approve to release payment.`,
          { href: projectUrl, label: "Review & approve" },
        ),
      };
    case "project_approved":
      return {
        subject: `Payment released: $${d.expert_payout}`,
        html: shell(
          "Project approved — funds released",
          `<b>${d.client_name ?? "Your client"}</b> approved the delivery. <b>$${d.expert_payout}</b> is on its way to your account.`,
          { href: projectUrl, label: "View project" },
        ),
      };
    case "project_cancelled":
      return {
        subject: "Project cancelled",
        html: shell(
          "A project was cancelled",
          `<b>${d.client_name ?? "The client"}</b> cancelled the project "${d.title ?? ""}". Funds have been refunded.`,
          { href: projectUrl, label: "View project" },
        ),
      };
    case "expert_approved":
      return {
        subject: `You're approved on ${BRAND}`,
        html: shell(
          `Welcome to ${BRAND}`,
          "Your profile has been approved and is now live.",
          { href: `${APP_URL}/dashboard/expert`, label: "Go to dashboard" },
        ),
      };
    case "welcome_client":
      return {
        subject: `Welcome to ${BRAND}`,
        html: shell(
          `Welcome${d.name ? `, ${d.name}` : ""}`,
          "Get started by exploring what katexs ai can do for you.",
          { href: `${APP_URL}/browse`, label: "Get started" },
        ),
      };
    case "welcome_expert":
      return {
        subject: "Application received",
        html: shell(
          `Thanks${d.name ? `, ${d.name}` : ""}`,
          "Your application is under review. We'll email you the moment it's approved (usually within 24 hours).",
        ),
      };
    case "order_placed": {
      const url = d.order_id ? `${APP_URL}/orders/${d.order_id}` : APP_URL;
      return {
        subject: `Order ${d.order_number ?? ""} placed`,
        html: shell(
          d.is_seller ? "You have a new order" : "Your order is confirmed",
          d.is_seller
            ? `<b>${d.buyer_name ?? "A buyer"}</b> placed order <b>${d.order_number ?? ""}</b> for <b>${d.gig_title ?? "your service"}</b> ($${d.price ?? 0}).`
            : `Payment received for <b>${d.gig_title ?? "your order"}</b>. Send your requirements so work can begin.`,
          { href: url, label: "Open order" },
        ),
      };
    }
    case "order_delivered": {
      const url = d.order_id ? `${APP_URL}/orders/${d.order_id}` : APP_URL;
      return {
        subject: `Delivery for ${d.order_number ?? "your order"}`,
        html: shell(
          "Your order was delivered",
          `<b>${d.seller_name ?? "Your provider"}</b> just delivered <b>${d.gig_title ?? "your order"}</b>. Review and accept to release payment.`,
          { href: url, label: "Review delivery" },
        ),
      };
    }
    case "order_completed": {
      const url = d.order_id ? `${APP_URL}/orders/${d.order_id}` : APP_URL;
      return {
        subject: `Order ${d.order_number ?? ""} completed`,
        html: shell(
          "Order completed",
          d.is_seller
            ? `<b>${d.buyer_name ?? "Your buyer"}</b> accepted the delivery. Funds will clear in 14 days.`
            : `Thanks for confirming. We'd love your review on <b>${d.gig_title ?? "this order"}</b>.`,
          { href: url, label: "View order" },
        ),
      };
    }
    case "order_refunded": {
      const url = d.order_id ? `${APP_URL}/orders/${d.order_id}` : APP_URL;
      return {
        subject: `Refund issued for ${d.order_number ?? "your order"}`,
        html: shell(
          "A refund was issued",
          `Order <b>${d.order_number ?? ""}</b> was cancelled and <b>$${d.amount ?? 0}</b> has been refunded to the original payment method.`,
          { href: url, label: "View order" },
        ),
      };
    }
    case "new_message": {
      const url = d.conversation_id ? `${APP_URL}/inbox/${d.conversation_id}` : `${APP_URL}/inbox`;
      return {
        subject: `New message from ${d.sender_name ?? "someone"}`,
        html: shell(
          "You have a new message",
          `<b>${d.sender_name ?? "Someone"}</b> sent you a message:<br/><br/><i>${(d.preview ?? "").slice(0, 200)}</i>`,
          { href: url, label: "Open inbox" },
        ),
      };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY_1") ?? Deno.env.get("RESEND_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    if (!resendKey) throw new Error("RESEND_API_KEY is not configured");

    const { template, to, data } = (await req.json()) as Payload;
    if (!template || !to) throw new Error("template and to required");

    const { subject, html } = render(template, data ?? {});

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: FROM_EMAIL.includes("<") ? FROM_EMAIL : `katexs ai <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend ${res.status}: ${text}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-marketplace-email error", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
