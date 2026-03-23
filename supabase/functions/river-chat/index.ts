import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    // Support both formats: { messages, context } and { message, userName, ... }
    const messages = body.messages || [{ role: "user", content: body.message || "" }];
    const context = body.context || (body.userName ? { userName: body.userName, businessName: body.businessName, industry: body.industry, date: new Date().toLocaleDateString() } : null);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = context
      ? `You are River, the AI business partner for Katexs — a SaaS platform for service businesses. You speak in a sharp, confident, data-driven tone. No fluff, no filler.

The user's name is ${context.userName || "there"}. Their business is "${context.businessName || "a service business"}" in the ${context.industry || "service"} industry. Today's date is ${context.date}.

Their current metrics:
- Calls today: ${context.callsToday ?? 0}
- New leads today: ${context.newLeads ?? 0}
- Booked today: ${context.booked ?? 0}
- Won this week: $${context.wonThisWeek ?? 0}
- Lost this week: ${context.lostThisWeek ?? 0}

${context.isGreeting ? "Generate a short 2-sentence personalized morning insight about their business. Be specific, sharp, and actionable. No generic advice. Also provide one actionable tip prefixed with 'TIP:' on a new line." : "Answer their question about their business using the metrics and context above. Be concise and actionable."}`
      : "You are River, an AI business assistant for Katexs. Be concise and actionable.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("river-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
