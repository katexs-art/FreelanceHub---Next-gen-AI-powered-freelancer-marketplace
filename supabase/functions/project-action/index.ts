// Lifecycle actions on a project: deliver (expert), approve (client),
// cancel (client). On approve, the held transaction is marked completed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "deliver" | "approve" | "cancel";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Unauthenticated");
    const user = userData.user;

    const { project_id, action } = (await req.json()) as { project_id: string; action: Action };
    if (!project_id || !action) throw new Error("project_id and action required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: project, error: pErr } = await admin
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .maybeSingle();
    if (pErr || !project) throw new Error("Project not found");

    const isClient = project.client_id === user.id;
    const isExpert = project.expert_id === user.id;
    if (!isClient && !isExpert) throw new Error("Forbidden");

    let nextStatus = project.status;
    if (action === "deliver") {
      if (!isExpert) throw new Error("Only the expert can deliver");
      nextStatus = "delivered";
    } else if (action === "approve") {
      if (!isClient) throw new Error("Only the client can approve");
      nextStatus = "completed";
    } else if (action === "cancel") {
      if (!isClient) throw new Error("Only the client can cancel");
      if (project.status !== "in_progress") throw new Error("Cannot cancel at this stage");
      nextStatus = "cancelled";
    } else {
      throw new Error("Unknown action");
    }

    await admin.from("projects").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", project_id);

    if (action === "approve") {
      await admin
        .from("transactions")
        .update({ status: "released" })
        .eq("project_id", project_id);
    }
    if (action === "cancel") {
      await admin
        .from("transactions")
        .update({ status: "refunded" })
        .eq("project_id", project_id);
    }

    return new Response(JSON.stringify({ ok: true, status: nextStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("project-action error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
