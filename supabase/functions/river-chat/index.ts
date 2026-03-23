import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RIVER_SYSTEM_PROMPT = `You are River, the AI business partner and intelligence engine inside Katexs — the operating system for service businesses.

You are not a generic AI assistant. You are a specialist in service business growth, lead conversion, automation, and operations. You think like a seasoned business consultant who also understands technology deeply.

Your personality: Direct. Sharp. Warm but no-nonsense. You give specific advice, not generic platitudes. You always reference the actual business data you have access to. You speak like a trusted partner, not a corporate chatbot.

Your role varies by context:
- Dashboard: Morning insights, performance analysis, actionable recommendations
- Inbox: Read conversations, craft responses, qualify leads, suggest next steps
- Pipeline: Analyze deals, spot at-risk opportunities, recommend actions
- Workflows: Build automations from plain English, optimize existing workflows
- Contacts: Score leads, identify patterns, suggest follow-up timing
- Support: Help clients solve problems, guide setup, troubleshoot issues
- General chat: Answer any business question using their real data

Always be specific. Always use their actual business name, industry, and data. Never give generic advice. If you don't have enough data, ask one focused question to get it.

Keep responses concise unless detail is specifically needed. Use plain language. No jargon unless the user is clearly technical.`;

function buildContextPrompt(context: any): string {
  if (!context) return "";
  const parts: string[] = [];
  if (context.userName) parts.push(`User: ${context.userName}`);
  if (context.businessName) parts.push(`Business: ${context.businessName}`);
  if (context.industry) parts.push(`Industry: ${context.industry}`);
  if (context.date) parts.push(`Date: ${context.date}`);
  if (context.callsToday !== undefined) parts.push(`Calls today: ${context.callsToday}`);
  if (context.newLeads !== undefined) parts.push(`New leads today: ${context.newLeads}`);
  if (context.booked !== undefined) parts.push(`Booked today: ${context.booked}`);
  if (context.wonThisWeek !== undefined) parts.push(`Won this week: $${context.wonThisWeek}`);
  if (context.lostThisWeek !== undefined) parts.push(`Lost this week: ${context.lostThisWeek}`);
  if (context.totalContacts !== undefined) parts.push(`Total contacts: ${context.totalContacts}`);
  if (context.activeWorkflows !== undefined) parts.push(`Active workflows: ${context.activeWorkflows}`);
  if (context.connectedIntegrations) parts.push(`Connected integrations: ${context.connectedIntegrations}`);
  if (context.pipelineValue !== undefined) parts.push(`Pipeline value: $${context.pipelineValue}`);
  if (context.contactData) parts.push(`Contact data: ${context.contactData}`);
  if (context.dealData) parts.push(`Deal data: ${context.dealData}`);
  if (context.conversationHistory) parts.push(`Conversation context: ${context.conversationHistory}`);
  if (context.affiliateStats) parts.push(`Affiliate stats: ${context.affiliateStats}`);
  if (context.workflowData) parts.push(`Workflow data: ${context.workflowData}`);
  if (context.ticketData) parts.push(`Support ticket: ${context.ticketData}`);
  return parts.length ? `\n\nCurrent business context:\n${parts.join("\n")}` : "";
}

type RiverFunction = 
  | "chat" | "morning_insight" | "build_workflow" | "analyze_contact" 
  | "pipeline_insight" | "craft_message" | "weekly_summary" 
  | "workflow_optimize" | "roi_calculate" | "support_assist" 
  | "affiliate_coach" | "onboarding_guide";

function getFunctionSystemPrompt(fn: RiverFunction, context: any): string {
  const ctx = buildContextPrompt(context);
  
  switch (fn) {
    case "morning_insight":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nGenerate a short 2-sentence personalized morning insight about their business. Be specific, sharp, and actionable. No generic advice. Then on a new line starting with "TIP:" provide one actionable tip.`;
    
    case "build_workflow":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nConvert the user's plain English description into a structured workflow. Available triggers: new_lead, missed_call, form_submitted, deal_stage_changed, time_delay, webhook_received, payment_received, tag_added. Available actions: send_sms, send_email, make_call, create_contact, update_deal_stage, add_tag, wait, send_webhook, notify_team, book_appointment. Return ONLY valid JSON: {"name": string, "trigger": string, "steps": [{"type": string, "label": string, "config": {}}]}`;
    
    case "analyze_contact":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nAnalyze this contact's history and provide: 1) A conversion score (0-100), 2) A brief assessment (1-2 sentences), 3) One recommended next action. Format: SCORE: [number]\nASSESSMENT: [text]\nACTION: [text]`;
    
    case "pipeline_insight":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nAnalyze the pipeline and provide: 1) Key insight about pipeline health, 2) Any at-risk deals, 3) One recommended action. Keep it to 3 sentences max.`;
    
    case "craft_message":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nCraft the perfect reply for this conversation. Match the channel tone (SMS = short, Email = professional, Chat = casual). Return ONLY the message text, nothing else.`;
    
    case "weekly_summary":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nGenerate a comprehensive weekly business summary with: highlights, concerns, and 3 specific recommendations for next week.`;
    
    case "workflow_optimize":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nAnalyze this workflow's performance and suggest specific improvements. Focus on conversion rates and timing optimization.`;
    
    case "roi_calculate":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nCalculate and explain the ROI in plain English. Include dollar amounts saved and earned. Keep to 2-3 sentences.`;
    
    case "support_assist":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nSuggest the best resolution for this support ticket. Include specific steps the support agent should take.`;
    
    case "affiliate_coach":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nGive one specific, actionable tip to improve this affiliate's performance. Reference their actual stats. 2 sentences max.`;
    
    case "onboarding_guide":
      return `${RIVER_SYSTEM_PROMPT}${ctx}\n\nGuide this new user through their next setup priority. Be specific to their industry. Recommend which integrations and workflows to set up first. 3 sentences max.`;
    
    default:
      return `${RIVER_SYSTEM_PROMPT}${ctx}`;
  }
}

// Choose model based on function complexity
function getModel(fn: RiverFunction): string {
  const heavyFns: RiverFunction[] = ["chat", "build_workflow", "craft_message", "weekly_summary", "support_assist"];
  return heavyFns.includes(fn) ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite";
}

function getMaxTokens(fn: RiverFunction): number {
  const tokenMap: Record<string, number> = {
    morning_insight: 200, analyze_contact: 200, pipeline_insight: 200,
    roi_calculate: 150, affiliate_coach: 150, onboarding_guide: 200,
    chat: 500, build_workflow: 800, craft_message: 300, weekly_summary: 600,
    workflow_optimize: 300, support_assist: 400,
  };
  return tokenMap[fn] || 500;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const fn: RiverFunction = body.function || "chat";
    const messages = body.messages || [{ role: "user", content: body.message || "" }];
    const context = body.context || {};
    const stream = body.stream !== false; // default true

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = getFunctionSystemPrompt(fn, context);
    const model = getModel(fn);
    const maxTokens = getMaxTokens(fn);

    const payload: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
    };

    if (stream) {
      payload.stream = true;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming response
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ response: content, function: fn, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("river-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
