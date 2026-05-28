// Sends transactional marketplace emails via the client's Resend account (BYOK).
// Templates: project_created, project_delivered, project_approved,
// project_cancelled, expert_approved, welcome_client, welcome_expert.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  | "welcome_expert";

interface Payload {
  template: Template;
  to: string;
  data?: Record<string, any>;
}

const BRAND = "katexs.";
const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://katexs.com";

function shell(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#020203;font-family:Inter,Arial,sans-serif;color:#f8f7f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020203;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f12;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
        <tr><td>
          <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:#f8f7f4;margin-bottom:32px;">${BRAND.slice(0,-1)}<span style="color:#4ade80;">.</span></div>
          <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#f8f7f4;letter-spacing:-0.01em;">${title}</h1>
          <div style="font-size:14px;line-height:1.6;color:#c8c7c2;margin-bottom:28px;">${body}</div>
          ${cta ? `<a href="${cta.href}" style="display:inline-block;background:#f8f7f4;color:#020203;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:13px;">${cta.label}</a>` : ""}
          <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#7a7975;">Sent by ${BRAND} marketplace</div>
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
          d.is_expert ? "You've got a new project" : "Your project is booked",
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
        subject: "You're approved on katexs",
        html: shell(
          "Welcome to the marketplace",
          "Your expert profile has been approved. Your services are now visible to clients browsing the marketplace.",
          { href: `${APP_URL}/dashboard/expert`, label: "Go to dashboard" },
        ),
      };
    case "welcome_client":
      return {
        subject: "Welcome to katexs",
        html: shell(
          `Welcome${d.name ? `, ${d.name}` : ""}`,
          "Browse vetted experts, book a project, and chat in real-time. Funds are held in escrow until you approve the delivery.",
          { href: `${APP_URL}/browse`, label: "Browse experts" },
        ),
      };
    case "welcome_expert":
      return {
        subject: "Application received",
        html: shell(
          `Thanks${d.name ? `, ${d.name}` : ""}`,
          "Your expert application is under review. We'll email you the moment it's approved (usually within 24 hours).",
        ),
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    if (!apiKey || !from) throw new Error("RESEND_API_KEY / RESEND_FROM_EMAIL not configured");

    const { template, to, data } = (await req.json()) as Payload;
    if (!template || !to) throw new Error("template and to required");

    const { subject, html } = render(template, data ?? {});

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${BRAND} <${from}>`, to: [to], subject, html }),
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
    // Log but never throw to caller — emails are best-effort
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await admin.from("error_logs").insert({
        function_name: "send-marketplace-email",
        error_message: (e as Error).message,
      });
    } catch {}
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200, // soft-fail
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
