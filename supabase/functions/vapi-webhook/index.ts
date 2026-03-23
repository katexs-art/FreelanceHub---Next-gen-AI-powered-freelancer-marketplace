import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    const { message } = payload;

    console.log("Vapi webhook received:", message?.type);

    // Handle different Vapi webhook event types
    if (message?.type === "end-of-call-report") {
      const call = message.call;
      if (call?.id) {
        // Find user by assistant ID
        const { data: assistant } = await supabase
          .from("vapi_assistants")
          .select("user_id")
          .eq("vapi_id", call.assistantId)
          .single();

        if (assistant) {
          await supabase.from("vapi_calls").upsert(
            {
              user_id: assistant.user_id,
              vapi_id: call.id,
              assistant_id: call.assistantId,
              phone_number_id: call.phoneNumberId,
              type: call.type,
              status: call.status || "ended",
              caller_number: call.customer?.number,
              duration_seconds: call.endedAt && call.startedAt
                ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
                : null,
              ended_reason: call.endedReason,
              transcript: typeof call.transcript === "string" ? call.transcript : JSON.stringify(call.transcript),
              recording_url: call.recordingUrl,
              summary: message.summary || call.summary,
              cost: call.cost,
              started_at: call.startedAt,
              ended_at: call.endedAt,
              raw_data: call,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "vapi_id" }
          );

          // Post to river-alerts channel
          const { data: channel } = await supabase
            .from("channels")
            .select("id")
            .eq("name", "river-alerts")
            .eq("created_by", assistant.user_id)
            .single();

          if (channel) {
            const duration = call.endedAt && call.startedAt
              ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
              : 0;
            await supabase.from("messenger_messages").insert({
              channel_id: channel.id,
              sender_id: assistant.user_id,
              content: `Call ${call.status === "ended" ? "completed" : call.status} with ${call.customer?.number || "unknown"}. Duration: ${duration}s. ${message.summary || ""}`,
              message_type: "river_alert",
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Vapi webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
