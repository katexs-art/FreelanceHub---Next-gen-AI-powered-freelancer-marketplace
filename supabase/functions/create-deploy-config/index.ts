import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const N8N_SCAN_URL =
  "https://n8n-wqps.srv1912599.hstgr.cloud/webhook/scan";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing url" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: row, error: insertError } = await supabase
      .from("deploy_configs")
      .insert({ url, status: "scanning" })
      .select("id")
      .single();

    if (insertError || !row) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create config" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const configId = row.id;

    let scanData: Record<string, unknown> | null = null;
    let webhookFailed = false;

    try {
      const scanRes = await fetch(N8N_SCAN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(30000),
      });

      if (scanRes.ok) {
        const raw = await scanRes.text();
        try {
          scanData = JSON.parse(raw);
        } catch {
          scanData = null;
          webhookFailed = true;
        }
      } else {
        webhookFailed = true;
      }
    } catch {
      webhookFailed = true;
    }

    if (scanData && !webhookFailed) {
      const { error: updateError } = await supabase
        .from("deploy_configs")
        .update({
          business_name: scanData.business_name || null,
          niche: scanData.niche || null,
          services: scanData.services || [],
          hours: scanData.hours || null,
          phones: scanData.phones || [],
          faq: scanData.faq || [],
          brand_colors: scanData.brand_colors || [],
          logo: scanData.logo || null,
          raw_config: scanData,
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", configId);

      if (updateError) console.error("Update error:", updateError);

      return new Response(
        JSON.stringify({ id: configId, status: "ready" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("deploy_configs")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", configId);

    return new Response(
      JSON.stringify({ id: configId, status: "failed", needsFallback: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("create-deploy-config error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
