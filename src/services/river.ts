/**
 * River AI — Central service for all River AI interactions.
 * All calls go through the river-chat edge function.
 */

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/river-chat`;
const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

export type RiverFunction =
  | "chat" | "morning_insight" | "build_workflow" | "analyze_contact"
  | "pipeline_insight" | "craft_message" | "weekly_summary"
  | "workflow_optimize" | "roi_calculate" | "support_assist"
  | "affiliate_coach" | "onboarding_guide";

export interface RiverContext {
  userName?: string;
  businessName?: string;
  industry?: string;
  date?: string;
  callsToday?: number;
  newLeads?: number;
  booked?: number;
  wonThisWeek?: number;
  lostThisWeek?: number;
  totalContacts?: number;
  activeWorkflows?: number;
  connectedIntegrations?: string;
  pipelineValue?: number;
  contactData?: string;
  dealData?: string;
  conversationHistory?: string;
  affiliateStats?: string;
  workflowData?: string;
  ticketData?: string;
  isGreeting?: boolean;
  [key: string]: any;
}

type Msg = { role: "user" | "assistant"; content: string };

// ── Streaming call ──
export async function riverStream(opts: {
  fn: RiverFunction;
  messages: Msg[];
  context?: RiverContext;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}) {
  const { fn, messages, context, onDelta, onDone, onError, signal } = opts;
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: AUTH_HEADER },
      body: JSON.stringify({ function: fn, messages, context, stream: true }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      if (resp.status === 429) throw new Error("River is busy. Try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`River error: ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buf = line + "\n" + buf;
          break;
        }
      }
    }
    onDone();
  } catch (err) {
    if (onError) onError(err as Error);
    else console.error("River stream error:", err);
  }
}

// ── Non-streaming call ──
export async function riverCall(opts: {
  fn: RiverFunction;
  messages: Msg[];
  context?: RiverContext;
}): Promise<string> {
  const { fn, messages, context } = opts;
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH_HEADER },
    body: JSON.stringify({ function: fn, messages, context, stream: false }),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("River is busy. Try again in a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`River error: ${resp.status}`);
  }

  const data = await resp.json();
  return data.response || "";
}

// ── Convenience wrappers ──

export async function riverMorningInsight(context: RiverContext): Promise<{ greeting: string; tip: string }> {
  const text = await riverCall({
    fn: "morning_insight",
    messages: [{ role: "user", content: "Give me my morning briefing." }],
    context,
  });
  const tipIdx = text.indexOf("TIP:");
  if (tipIdx !== -1) {
    return { greeting: text.slice(0, tipIdx).trim(), tip: text.slice(tipIdx + 4).trim() };
  }
  return { greeting: text, tip: "" };
}

export async function riverAnalyzeContact(context: RiverContext): Promise<{ score: number; assessment: string; action: string }> {
  const text = await riverCall({
    fn: "analyze_contact",
    messages: [{ role: "user", content: "Analyze this contact and score them." }],
    context,
  });
  const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
  const assessmentMatch = text.match(/ASSESSMENT:\s*(.+?)(?=\nACTION:|$)/is);
  const actionMatch = text.match(/ACTION:\s*(.+)/i);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
    assessment: assessmentMatch ? assessmentMatch[1].trim() : text,
    action: actionMatch ? actionMatch[1].trim() : "Follow up soon",
  };
}

export async function riverPipelineInsight(context: RiverContext): Promise<string> {
  return riverCall({
    fn: "pipeline_insight",
    messages: [{ role: "user", content: "Analyze my pipeline health." }],
    context,
  });
}

export async function riverCraftMessage(context: RiverContext, goal?: string): Promise<string> {
  return riverCall({
    fn: "craft_message",
    messages: [{ role: "user", content: goal || "Draft the best reply for this conversation." }],
    context,
  });
}

export async function riverBuildWorkflow(description: string, context: RiverContext): Promise<any> {
  const text = await riverCall({
    fn: "build_workflow",
    messages: [{ role: "user", content: description }],
    context,
  });
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

export async function riverWorkflowOptimize(context: RiverContext): Promise<string> {
  return riverCall({
    fn: "workflow_optimize",
    messages: [{ role: "user", content: "Optimize this workflow." }],
    context,
  });
}

export async function riverROICalculate(context: RiverContext): Promise<string> {
  return riverCall({
    fn: "roi_calculate",
    messages: [{ role: "user", content: "Calculate my River ROI." }],
    context,
  });
}

export async function riverAffiliateCoach(context: RiverContext): Promise<string> {
  return riverCall({
    fn: "affiliate_coach",
    messages: [{ role: "user", content: "Give me a tip to improve my affiliate performance." }],
    context,
  });
}

export async function riverOnboardingGuide(context: RiverContext): Promise<string> {
  return riverCall({
    fn: "onboarding_guide",
    messages: [{ role: "user", content: "What should I set up first?" }],
    context,
  });
}

export async function riverSupportAssist(context: RiverContext): Promise<string> {
  return riverCall({
    fn: "support_assist",
    messages: [{ role: "user", content: "Suggest the best resolution for this ticket." }],
    context,
  });
}

// ── Build business context from user profile and metrics ──
export function buildBusinessContext(profile: any, metrics?: any): RiverContext {
  return {
    userName: profile?.full_name?.split(" ")[0] || "there",
    businessName: profile?.business_name || undefined,
    industry: profile?.industry || undefined,
    date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    callsToday: metrics?.callsToday ?? 0,
    newLeads: metrics?.newLeads ?? 0,
    booked: metrics?.booked ?? 0,
    wonThisWeek: metrics?.wonThisWeek ?? 0,
    lostThisWeek: metrics?.lostThisWeek ?? 0,
    totalContacts: metrics?.totalContacts,
    activeWorkflows: metrics?.activeWorkflows,
    pipelineValue: metrics?.pipelineValue,
  };
}
