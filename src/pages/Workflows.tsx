import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRiverChat } from "@/hooks/useRiverChat";
import {
  Plus, Play, Pause, Trash2, Copy, Zap, Clock, Mail,
  MessageSquare, Phone, Search, LayoutGrid, List, X,
  Send, Sparkles, ArrowRight, Activity, Timer, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { TEMPLATES, TRIGGERS, type WorkflowData, type WorkflowNode, type WorkflowConnection } from "@/components/workflows/WorkflowTypes";
import type { Json } from "@/integrations/supabase/types";

// Convert DB row to WorkflowData
function rowToWorkflow(row: any): WorkflowData {
  const steps = row.steps;
  let nodes: WorkflowNode[] = [];
  let connections: WorkflowConnection[] = [];

  if (steps && typeof steps === "object" && "nodes" in steps) {
    nodes = (steps as any).nodes || [];
    connections = (steps as any).connections || [];
  } else if (Array.isArray(steps)) {
    // Legacy linear steps → convert to nodes
    nodes = (steps as any[]).map((s: any, i: number) => ({
      id: s.id || crypto.randomUUID(),
      type: s.type === "ai" ? "river" as const : "action" as const,
      blockType: s.type === "sms" ? "send_sms" : s.type === "email" ? "send_email" : s.type === "delay" ? "wait" : s.type === "condition" ? "contact_replied" : s.type || "send_sms",
      label: s.label || s.type,
      config: s.config || {},
      x: 300,
      y: 60 + i * 140,
    }));
    connections = nodes.slice(0, -1).map((n, i) => ({
      id: crypto.randomUUID(),
      fromNodeId: n.id,
      toNodeId: nodes[i + 1].id,
      fromPort: "default" as const,
    }));
  }

  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    nodes,
    connections,
    active: row.active,
    runs_count: row.runs_count,
    created_at: row.created_at,
    user_id: row.user_id,
  };
}

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  missed_call: <Phone size={12} />,
  new_lead: <UserPlus size={12} />,
  time_delay: <Clock size={12} />,
  deal_stage_changed: <Activity size={12} />,
  contact_created: <UserPlus size={12} />,
  deal_won: <Zap size={12} />,
  deal_booked: <Zap size={12} />,
  manual: <Play size={12} />,
};

const Workflows = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowData | null>(null);
  const [riverInput, setRiverInput] = useState("");
  const [riverLoading, setRiverLoading] = useState(false);
  const [riverResult, setRiverResult] = useState<string>("");

  const fetchWorkflows = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setWorkflows(data.map(rowToWorkflow));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleSave = async (wf: WorkflowData) => {
    if (!user) return;
    if (!wf.name?.trim()) { toast.error("Workflow name is required"); return; }

    const stepsJson = { nodes: wf.nodes, connections: wf.connections } as unknown as Json;

    if (wf.id) {
      await supabase.from("workflows")
        .update({ name: wf.name, trigger: wf.trigger, steps: stepsJson })
        .eq("id", wf.id);
      toast.success("Workflow saved");
    } else {
      await supabase.from("workflows").insert({
        user_id: user.id,
        name: wf.name,
        trigger: wf.trigger,
        steps: stepsJson,
      });
      toast.success("Workflow created");
    }
    setShowBuilder(false);
    setEditingWorkflow(null);
    fetchWorkflows();
  };

  const toggleActive = async (wf: WorkflowData) => {
    if (!wf.id) return;
    await supabase.from("workflows").update({ active: !wf.active }).eq("id", wf.id);
    setWorkflows((prev) => prev.map((w) => (w.id === wf.id ? { ...w, active: !w.active } : w)));
    toast.success(wf.active ? "Workflow paused" : "Workflow activated");
  };

  const duplicateWorkflow = async (wf: WorkflowData) => {
    if (!user || !wf.id) return;
    const stepsJson = { nodes: wf.nodes, connections: wf.connections } as unknown as Json;
    await supabase.from("workflows").insert({
      user_id: user.id,
      name: `${wf.name} (copy)`,
      trigger: wf.trigger,
      steps: stepsJson,
    });
    toast.success("Workflow duplicated");
    fetchWorkflows();
  };

  const deleteWorkflow = async (id: string) => {
    await supabase.from("workflows").delete().eq("id", id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    toast.success("Workflow deleted");
  };

  const createFromTemplate = (tpl: typeof TEMPLATES[0]) => {
    const wf: WorkflowData = {
      name: tpl.name,
      trigger: tpl.trigger,
      nodes: tpl.nodes.map((n) => ({ ...n, id: crypto.randomUUID() })),
      connections: [], // Will be rebuilt
      active: false,
      runs_count: 0,
    };
    // Rebuild connections with new IDs
    wf.connections = tpl.connections.map((c, i) => ({
      id: crypto.randomUUID(),
      fromNodeId: wf.nodes[tpl.nodes.findIndex((n) => n.id === c.fromNodeId)]?.id || "",
      toNodeId: wf.nodes[tpl.nodes.findIndex((n) => n.id === c.toNodeId)]?.id || "",
      fromPort: c.fromPort,
    })).filter((c) => c.fromNodeId && c.toNodeId);
    setEditingWorkflow(wf);
    setShowBuilder(true);
  };

  const handleRiverSubmit = async () => {
    if (!riverInput.trim()) return;
    setRiverLoading(true);
    setRiverResult("");
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/river-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Convert this plain English description into a structured workflow. Available triggers: new_lead, missed_call, form_submitted, deal_stage_changed, time_delay, webhook_received, payment_received, tag_added. Available actions: send_sms, send_email, river_call, create_contact, update_contact, move_deal, add_tag, wait, send_webhook, notify_team, book_appointment. Return a brief description of the workflow steps in plain text, numbered. Description: "${riverInput}"` }],
        }),
      });
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                result += content;
                setRiverResult(result);
              }
            } catch {}
          }
        }
      }
    } catch {
      setRiverResult("Sorry, I couldn't process that. Try describing your workflow differently.");
    }
    setRiverLoading(false);
  };

  const activeCount = workflows.filter((w) => w.active).length;
  const totalRuns = workflows.reduce((sum, w) => sum + w.runs_count, 0);
  const filtered = workflows.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));

  const RIVER_EXAMPLES = [
    "When a lead doesn't book in 24hrs send follow-up SMS",
    "After every completed job send review request",
    "When missed call text back instantly",
    "New Facebook lead → River calls immediately",
  ];

  // Full screen builder
  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflow={editingWorkflow}
        onSave={handleSave}
        onClose={() => { setShowBuilder(false); setEditingWorkflow(null); }}
      />
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-[hsl(var(--background-elevated))] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-[hsl(var(--background-elevated))] rounded-xl animate-pulse" />)}
        </div>
        <div className="h-32 bg-[hsl(var(--background-elevated))] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-[-0.03em]">Workflows</h1>
          <p className="text-[13px] text-foreground-secondary mt-0.5">
            {activeCount} active · {totalRuns} executions today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => document.getElementById("templates-section")?.scrollIntoView({ behavior: "smooth" })}
            className="px-3 py-2 text-[12px] text-foreground border border-[hsl(var(--border-subtle))] rounded-md hover:border-[hsl(var(--border-strong))] transition-colors"
          >
            Templates
          </button>
          <button
            onClick={() => { setEditingWorkflow(null); setShowBuilder(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-[12px] font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> New workflow
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active workflows", value: String(activeCount), delta: "+2 this week", positive: true },
          { label: "Total executions", value: String(totalRuns), delta: "Today", positive: true },
          { label: "Leads recovered", value: "—", delta: "By River AI", positive: true },
          { label: "Time saved", value: `${Math.round(totalRuns * 4)} min`, delta: "~4 min/run", positive: true },
        ].map((m) => (
          <div key={m.label} className="bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] rounded-[10px] p-4">
            <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em]">{m.label}</p>
            <p className="text-[28px] font-bold text-foreground tracking-[-0.03em] mt-1">{m.value}</p>
            <p className={`text-[11px] mt-0.5 ${m.positive ? "text-[hsl(var(--accent-green))]" : "text-foreground-secondary"}`}>{m.delta}</p>
          </div>
        ))}
      </div>

      {/* River Workflow Assistant */}
      <div className="bg-[hsl(var(--accent-purple))]/[0.06] border border-[hsl(var(--accent-purple))]/15 border-t-2 border-t-[hsl(var(--accent-purple))] rounded-[10px] p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent-purple))]" />
          <span className="text-[13px] font-semibold text-[#AFA9EC]">River Workflow Assistant</span>
          <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--accent-purple))]/10 text-[hsl(var(--accent-purple))] text-[9px] font-medium">AI</span>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            value={riverInput}
            onChange={(e) => setRiverInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRiverSubmit()}
            placeholder="Describe a workflow in plain English..."
            className="flex-1 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--accent-purple))]/20 rounded-lg px-4 py-2.5 text-[13px] text-foreground outline-none placeholder:text-foreground-muted focus:border-[hsl(var(--accent-purple))]/40"
          />
          <button
            onClick={handleRiverSubmit}
            disabled={riverLoading || !riverInput.trim()}
            className="px-4 py-2.5 bg-[hsl(var(--accent-purple))] text-white text-[12px] font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
          >
            {riverLoading ? <Sparkles size={14} className="animate-spin" /> : <Send size={14} />}
            {riverLoading ? "Building..." : "Build it"}
          </button>
        </div>

        {/* Example pills */}
        <div className="flex flex-wrap gap-2">
          {RIVER_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setRiverInput(ex); }}
              className="px-3 py-1.5 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border))] rounded-full text-[11px] text-foreground-secondary hover:text-foreground hover:border-[hsl(var(--border-strong))] transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* River result */}
        {riverResult && (
          <div className="mt-4 bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg p-4">
            <p className="text-[12px] text-foreground whitespace-pre-wrap">{riverResult}</p>
            <button
              onClick={() => { setEditingWorkflow(null); setShowBuilder(true); }}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              <ArrowRight size={12} /> Open in builder
            </button>
          </div>
        )}
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows..."
            className="pl-8 pr-3 py-2 w-[220px] bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border))] rounded-lg text-[12px] text-foreground outline-none placeholder:text-foreground-muted focus:border-[hsl(var(--ring))]"
          />
        </div>
        <div className="flex border border-[hsl(var(--border))] rounded-lg overflow-hidden">
          <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-[hsl(var(--background-elevated))] text-foreground" : "text-foreground-secondary"}`}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => setView("list")} className={`p-2 ${view === "list" ? "bg-[hsl(var(--background-elevated))] text-foreground" : "text-foreground-secondary"}`}>
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Workflow cards */}
      {filtered.length > 0 ? (
        <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-2"}>
          {filtered.map((wf) => (
            <div
              key={wf.id}
              className="bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] rounded-xl p-5 hover:border-[hsl(var(--border-strong))] transition-colors cursor-pointer group"
              onClick={() => { setEditingWorkflow(wf); setShowBuilder(true); }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-semibold text-foreground truncate max-w-[200px]">{wf.name}</span>
                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(wf)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                      wf.active
                        ? "bg-[hsl(var(--accent-green))]/10 text-[hsl(var(--accent-green))]"
                        : "bg-[hsl(var(--background-elevated))] text-foreground-muted"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${wf.active ? "bg-[hsl(var(--accent-green))]" : "bg-foreground-muted"}`} />
                    {wf.active ? "Active" : "Paused"}
                  </button>
                </div>
              </div>

              {/* Trigger badge */}
              {wf.trigger && (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--accent-green))]/10 text-[hsl(var(--accent-green))] text-[10px] font-medium">
                    {TRIGGER_ICONS[wf.trigger] || <Zap size={10} />}
                    {TRIGGERS.find((t) => t.value === wf.trigger)?.label || wf.trigger}
                  </span>
                </div>
              )}

              {/* Steps preview */}
              <div className="flex items-center gap-1 mb-3">
                {wf.nodes.slice(0, 5).map((n, i) => (
                  <span key={n.id} className="flex items-center">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] ${
                      n.type === "trigger" ? "bg-[hsl(var(--accent-green))]/10 text-[hsl(var(--accent-green))]" :
                      n.type === "river" ? "bg-[hsl(var(--accent-purple))]/10 text-[hsl(var(--accent-purple))]" :
                      n.type === "condition" ? "bg-amber-500/10 text-amber-400" :
                      "bg-[hsl(var(--background-elevated))] text-foreground-secondary"
                    }`}>
                      {n.label.charAt(0)}
                    </span>
                    {i < Math.min(wf.nodes.length, 5) - 1 && (
                      <span className="w-3 h-px bg-[hsl(var(--border-subtle))]" />
                    )}
                  </span>
                ))}
                {wf.nodes.length > 5 && <span className="text-[10px] text-foreground-muted ml-1">+{wf.nodes.length - 5}</span>}
              </div>

              {/* Stats + actions */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground-muted">{wf.runs_count} runs · {wf.nodes.length} steps</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEditingWorkflow(wf); setShowBuilder(true); }} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary text-[10px]">
                    Edit
                  </button>
                  <button onClick={() => duplicateWorkflow(wf)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
                    <Copy size={12} />
                  </button>
                  <button onClick={() => wf.id && deleteWorkflow(wf.id)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--background-elevated))] border border-dashed border-[hsl(var(--border-subtle))] flex items-center justify-center mb-4">
            <Zap size={20} className="text-foreground-muted" />
          </div>
          <p className="text-[14px] text-foreground mb-1">No workflows yet</p>
          <p className="text-[12px] text-foreground-secondary mb-4">Create your first automation or start from a template.</p>
          <button
            onClick={() => { setEditingWorkflow(null); setShowBuilder(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[12px] font-medium rounded-md"
          >
            <Plus size={14} /> Create workflow
          </button>
        </div>
      )}

      {/* Quick start templates */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-3">Quick start templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.map((tpl) => (
            <div
              key={tpl.name}
              className="bg-[hsl(var(--background-secondary))] border border-[hsl(var(--border))] rounded-[10px] p-4 hover:border-[hsl(var(--border-strong))] transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--accent-green))]/10 text-[hsl(var(--accent-green))] text-[10px] font-medium">
                  {TRIGGER_ICONS[tpl.trigger] || <Zap size={10} />}
                  {TRIGGERS.find((t) => t.value === tpl.trigger)?.label}
                </span>
              </div>
              <p className="text-[13px] font-medium text-foreground mb-1">{tpl.name}</p>
              <p className="text-[11px] text-foreground-secondary mb-3">{tpl.desc}</p>
              <button
                onClick={() => createFromTemplate(tpl)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-medium rounded-md hover:opacity-90 transition-opacity"
              >
                <Play size={11} /> Activate
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Workflows;
