import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, Play, Pause, Trash2, Copy, MoreVertical, Zap, Clock, Mail,
  MessageSquare, Phone, Filter, ArrowRight, ChevronDown, ChevronRight,
  Search, LayoutGrid, List, Settings, X, GripVertical, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

// ── Types ──────────────────────────────────────────────────────────────
interface WorkflowStep {
  id: string;
  type: "delay" | "sms" | "email" | "condition" | "action" | "ai";
  config: Record<string, string>;
  label: string;
}

interface Workflow {
  id: string;
  name: string;
  trigger: string | null;
  steps: WorkflowStep[];
  active: boolean;
  runs_count: number;
  created_at: string;
  user_id: string;
}

// ── Templates ──────────────────────────────────────────────────────────
const TEMPLATES: { name: string; trigger: string; steps: WorkflowStep[]; desc: string; icon: React.ReactNode }[] = [
  {
    name: "Missed call text-back",
    trigger: "missed_call",
    desc: "Send an SMS when a call is missed. River responds instantly.",
    icon: <Phone size={14} />,
    steps: [
      { id: "1", type: "sms", label: "Send callback SMS", config: { message: "Hey {{contact_name}}, sorry we missed your call! How can we help?" } },
      { id: "2", type: "delay", label: "Wait 5 minutes", config: { duration: "5", unit: "minutes" } },
      { id: "3", type: "condition", label: "Check if replied", config: { field: "replied", operator: "equals", value: "false" } },
      { id: "4", type: "sms", label: "Follow-up SMS", config: { message: "Just following up — would you like to book a time?" } },
    ],
  },
  {
    name: "New lead nurture",
    trigger: "contact_created",
    desc: "Automated follow-up sequence for new leads over 3 days.",
    icon: <Zap size={14} />,
    steps: [
      { id: "1", type: "sms", label: "Welcome SMS", config: { message: "Hey {{contact_name}}, thanks for reaching out! We'd love to help." } },
      { id: "2", type: "delay", label: "Wait 1 day", config: { duration: "1", unit: "days" } },
      { id: "3", type: "email", label: "Send intro email", config: { subject: "Welcome to {{business_name}}", body: "Here's what we can do for you..." } },
      { id: "4", type: "delay", label: "Wait 2 days", config: { duration: "2", unit: "days" } },
      { id: "5", type: "sms", label: "Check-in SMS", config: { message: "Hi {{contact_name}}, just checking in. Any questions?" } },
    ],
  },
  {
    name: "Booking confirmation",
    trigger: "deal_booked",
    desc: "Confirm bookings with SMS + email automatically.",
    icon: <Mail size={14} />,
    steps: [
      { id: "1", type: "sms", label: "Booking confirmed SMS", config: { message: "Your appointment is confirmed! See you soon." } },
      { id: "2", type: "email", label: "Confirmation email", config: { subject: "Booking Confirmed", body: "Your booking details..." } },
    ],
  },
  {
    name: "Re-engage cold leads",
    trigger: "manual",
    desc: "Win back cold leads with a timed SMS + email sequence.",
    icon: <Clock size={14} />,
    steps: [
      { id: "1", type: "sms", label: "Re-engagement SMS", config: { message: "Hey {{contact_name}}, we haven't heard from you in a while. Still interested?" } },
      { id: "2", type: "delay", label: "Wait 3 days", config: { duration: "3", unit: "days" } },
      { id: "3", type: "email", label: "Offer email", config: { subject: "We'd love to help", body: "Special offer inside..." } },
    ],
  },
  {
    name: "Post-service follow-up",
    trigger: "deal_won",
    desc: "Ask for reviews and referrals after completing a job.",
    icon: <MessageSquare size={14} />,
    steps: [
      { id: "1", type: "delay", label: "Wait 1 day", config: { duration: "1", unit: "days" } },
      { id: "2", type: "sms", label: "Review request", config: { message: "Thanks for choosing us! Mind leaving a quick review? {{review_link}}" } },
      { id: "3", type: "delay", label: "Wait 3 days", config: { duration: "3", unit: "days" } },
      { id: "4", type: "sms", label: "Referral ask", config: { message: "Know anyone who could use our services? We'd appreciate the referral!" } },
    ],
  },
];

const STEP_TYPES: { type: WorkflowStep["type"]; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "sms", label: "Send SMS", icon: <MessageSquare size={14} />, color: "text-green-400" },
  { type: "email", label: "Send Email", icon: <Mail size={14} />, color: "text-blue-400" },
  { type: "delay", label: "Wait / Delay", icon: <Clock size={14} />, color: "text-amber-400" },
  { type: "condition", label: "Condition", icon: <Filter size={14} />, color: "text-purple-400" },
  { type: "action", label: "Action", icon: <Zap size={14} />, color: "text-white" },
  { type: "ai", label: "River AI", icon: <Zap size={14} />, color: "text-[hsl(var(--accent-purple))]" },
];

const TRIGGERS = [
  { value: "contact_created", label: "New contact added" },
  { value: "missed_call", label: "Missed call" },
  { value: "deal_booked", label: "Deal booked" },
  { value: "deal_won", label: "Deal won" },
  { value: "deal_lost", label: "Deal lost" },
  { value: "form_submitted", label: "Form submitted" },
  { value: "manual", label: "Manual trigger" },
];

// ── Step Icon ──────────────────────────────────────────────────────────
function StepIcon({ type }: { type: WorkflowStep["type"] }) {
  const found = STEP_TYPES.find((s) => s.type === type);
  return <span className={found?.color ?? "text-foreground-secondary"}>{found?.icon}</span>;
}

// ── Workflow Builder Modal ─────────────────────────────────────────────
function WorkflowBuilderModal({
  workflow,
  onClose,
  onSave,
}: {
  workflow: Workflow | null;
  onClose: () => void;
  onSave: (w: Partial<Workflow>) => void;
}) {
  const [name, setName] = useState(workflow?.name ?? "");
  const [trigger, setTrigger] = useState(workflow?.trigger ?? "contact_created");
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps ?? []);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const addStep = (type: WorkflowStep["type"]) => {
    const found = STEP_TYPES.find((s) => s.type === type);
    setSteps((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        label: found?.label ?? type,
        config: type === "delay" ? { duration: "5", unit: "minutes" } : {},
      },
    ]);
  };

  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));

  const updateStepConfig = (id: string, key: string, value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s)));
  };

  const updateStepLabel = (id: string, label: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const updated = [...steps];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setSteps(updated);
    setDragIdx(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="w-full max-w-[900px] max-h-[90vh] bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-[hsl(var(--accent-green))]" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workflow name..."
              className="bg-transparent text-[15px] font-semibold text-foreground outline-none placeholder:text-foreground-muted w-[260px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave({ name, trigger, steps })}
              className="px-4 py-1.5 bg-white text-black text-xs font-medium rounded-md hover:bg-white/90 transition-colors"
            >
              Save workflow
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Step palette */}
          <div className="w-[220px] border-r border-[hsl(var(--border))] p-4 flex flex-col gap-4 overflow-y-auto">
            {/* Trigger */}
            <div>
              <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-2">Trigger</p>
              <select
                value={trigger ?? ""}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg text-xs text-foreground px-3 py-2 outline-none focus:border-[hsl(var(--ring))]"
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Add steps */}
            <div>
              <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-2">Add Step</p>
              <div className="flex flex-col gap-1.5">
                {STEP_TYPES.map((st) => (
                  <button
                    key={st.type}
                    onClick={() => addStep(st.type)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border))] text-xs text-foreground hover:border-[hsl(var(--border-strong))] transition-colors"
                  >
                    <span className={st.color}>{st.icon}</span>
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div>
              <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-2">Quick Templates</p>
              <div className="flex flex-col gap-1.5">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setName(t.name);
                      setTrigger(t.trigger);
                      setSteps(t.steps.map((s) => ({ ...s, id: crypto.randomUUID() })));
                    }}
                    className="text-left px-3 py-2 rounded-lg bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border))] text-[11px] text-foreground-secondary hover:text-foreground hover:border-[hsl(var(--border-strong))] transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Visual builder */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Trigger node */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-xl">
                <Zap size={14} className="text-[hsl(var(--accent-green))]" />
                <span className="text-xs font-medium text-foreground">
                  {TRIGGERS.find((t) => t.value === trigger)?.label ?? "Select trigger"}
                </span>
              </div>
              {steps.length > 0 && <div className="w-px h-6 bg-[hsl(var(--border-subtle))]" />}
            </div>

            {/* Steps */}
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                  className={`w-full max-w-[420px] bg-[hsl(var(--background-elevated))] border rounded-xl transition-all ${
                    editingStep === step.id ? "border-[hsl(var(--border-strong))]" : "border-[hsl(var(--border))]"
                  }`}
                >
                  {/* Step header */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                    onClick={() => setEditingStep(editingStep === step.id ? null : step.id)}
                  >
                    <GripVertical size={12} className="text-foreground-muted cursor-grab" />
                    <StepIcon type={step.type} />
                    <input
                      value={step.label}
                      onChange={(e) => updateStepLabel(step.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent text-xs font-medium text-foreground outline-none"
                    />
                    <span className="text-[10px] text-foreground-muted uppercase">{step.type}</span>
                    {editingStep === step.id ? <ChevronDown size={12} className="text-foreground-secondary" /> : <ChevronRight size={12} className="text-foreground-secondary" />}
                    <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-1 hover:bg-[hsl(var(--background-card))] rounded text-foreground-muted hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Step config */}
                  {editingStep === step.id && (
                    <div className="px-4 pb-4 pt-1 border-t border-[hsl(var(--border))] flex flex-col gap-2">
                      {step.type === "delay" && (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={step.config.duration ?? "5"}
                            onChange={(e) => updateStepConfig(step.id, "duration", e.target.value)}
                            className="w-20 bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                          />
                          <select
                            value={step.config.unit ?? "minutes"}
                            onChange={(e) => updateStepConfig(step.id, "unit", e.target.value)}
                            className="bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                          >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                      )}
                      {step.type === "sms" && (
                        <textarea
                          value={step.config.message ?? ""}
                          onChange={(e) => updateStepConfig(step.id, "message", e.target.value)}
                          placeholder="SMS message..."
                          className="w-full bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-xs text-foreground outline-none resize-none h-16"
                        />
                      )}
                      {step.type === "email" && (
                        <>
                          <input
                            value={step.config.subject ?? ""}
                            onChange={(e) => updateStepConfig(step.id, "subject", e.target.value)}
                            placeholder="Subject line..."
                            className="w-full bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-xs text-foreground outline-none"
                          />
                          <textarea
                            value={step.config.body ?? ""}
                            onChange={(e) => updateStepConfig(step.id, "body", e.target.value)}
                            placeholder="Email body..."
                            className="w-full bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-xs text-foreground outline-none resize-none h-16"
                          />
                        </>
                      )}
                      {step.type === "condition" && (
                        <div className="flex gap-2 items-center">
                          <input
                            value={step.config.field ?? ""}
                            onChange={(e) => updateStepConfig(step.id, "field", e.target.value)}
                            placeholder="Field"
                            className="flex-1 bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                          />
                          <select
                            value={step.config.operator ?? "equals"}
                            onChange={(e) => updateStepConfig(step.id, "operator", e.target.value)}
                            className="bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                          >
                            <option value="equals">equals</option>
                            <option value="not_equals">not equals</option>
                            <option value="contains">contains</option>
                          </select>
                          <input
                            value={step.config.value ?? ""}
                            onChange={(e) => updateStepConfig(step.id, "value", e.target.value)}
                            placeholder="Value"
                            className="flex-1 bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-1.5 text-xs text-foreground outline-none"
                          />
                        </div>
                      )}
                      {(step.type === "action" || step.type === "ai") && (
                        <textarea
                          value={step.config.instruction ?? ""}
                          onChange={(e) => updateStepConfig(step.id, "instruction", e.target.value)}
                          placeholder={step.type === "ai" ? "Tell River what to do..." : "Action description..."}
                          className="w-full bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-xs text-foreground outline-none resize-none h-16"
                        />
                      )}
                    </div>
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex flex-col items-center">
                    <div className="w-px h-4 bg-[hsl(var(--border-subtle))]" />
                    <ArrowRight size={10} className="text-foreground-muted rotate-90" />
                    <div className="w-px h-4 bg-[hsl(var(--border-subtle))]" />
                  </div>
                )}
              </div>
            ))}

            {/* Empty state */}
            {steps.length === 0 && (
              <div className="mt-8 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--background-elevated))] border border-dashed border-[hsl(var(--border-subtle))] flex items-center justify-center">
                  <Plus size={18} className="text-foreground-muted" />
                </div>
                <p className="text-xs text-foreground-secondary">Add steps from the left panel or pick a template</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
const Workflows = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setWorkflows(
        data.map((w) => ({
          ...w,
          steps: Array.isArray(w.steps) ? (w.steps as unknown as WorkflowStep[]) : [],
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleSave = async (partial: Partial<Workflow>) => {
    if (!user) return;
    if (!partial.name?.trim()) { toast.error("Workflow name is required"); return; }

    if (editingWorkflow) {
      await supabase
        .from("workflows")
        .update({ name: partial.name, trigger: partial.trigger, steps: partial.steps as unknown as Json })
        .eq("id", editingWorkflow.id);
      toast.success("Workflow updated");
    } else {
      await supabase.from("workflows").insert({
        user_id: user.id,
        name: partial.name!,
        trigger: partial.trigger,
        steps: (partial.steps ?? []) as unknown as Json,
      });
      toast.success("Workflow created");
    }
    setShowBuilder(false);
    setEditingWorkflow(null);
    fetchWorkflows();
  };

  const toggleActive = async (w: Workflow) => {
    await supabase.from("workflows").update({ active: !w.active }).eq("id", w.id);
    setWorkflows((prev) => prev.map((wf) => (wf.id === w.id ? { ...wf, active: !wf.active } : wf)));
    toast.success(w.active ? "Workflow paused" : "Workflow activated");
  };

  const duplicateWorkflow = async (w: Workflow) => {
    if (!user) return;
    await supabase.from("workflows").insert({
      user_id: user.id,
      name: `${w.name} (copy)`,
      trigger: w.trigger,
      steps: w.steps as unknown as Json,
    });
    toast.success("Workflow duplicated");
    fetchWorkflows();
  };

  const deleteWorkflow = async (id: string) => {
    await supabase.from("workflows").delete().eq("id", id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    toast.success("Workflow deleted");
  };

  const createFromTemplate = async (tpl: typeof TEMPLATES[0]) => {
    if (!user) return;
    await supabase.from("workflows").insert({
      user_id: user.id,
      name: tpl.name,
      trigger: tpl.trigger,
      steps: tpl.steps as unknown as Json,
    });
    toast.success(`"${tpl.name}" workflow created`);
    setShowTemplates(false);
    fetchWorkflows();
  };

  const filtered = workflows.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));

  // Skeleton
  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 w-40 bg-[hsl(var(--background-elevated))] rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-[hsl(var(--background-elevated))] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-[-0.03em]">Workflows</h1>
          <p className="text-[13px] text-foreground-secondary mt-0.5">{workflows.length} workflow{workflows.length !== 1 ? "s" : ""} · {workflows.filter((w) => w.active).length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflows..."
              className="pl-8 pr-3 py-2 w-[200px] bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border))] rounded-lg text-xs text-foreground outline-none placeholder:text-foreground-secondary focus:border-[hsl(var(--ring))]"
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
          <button onClick={() => setShowTemplates(true)} className="px-3 py-2 text-xs text-foreground border border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-strong))] transition-colors">
            Templates
          </button>
          <button
            onClick={() => { setEditingWorkflow(null); setShowBuilder(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus size={14} /> New workflow
          </button>
        </div>
      </div>

      {/* Workflow grid/list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--background-elevated))] border border-dashed border-[hsl(var(--border-subtle))] flex items-center justify-center mb-4">
            <Zap size={20} className="text-foreground-muted" />
          </div>
          <p className="text-sm text-foreground mb-1">No workflows yet</p>
          <p className="text-xs text-foreground-secondary mb-4">Create your first automation or start from a template.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowTemplates(true)} className="px-3 py-2 text-xs text-foreground border border-[hsl(var(--border-subtle))] rounded-lg hover:border-[hsl(var(--border-strong))]">
              Browse templates
            </button>
            <button
              onClick={() => { setEditingWorkflow(null); setShowBuilder(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-black text-xs font-medium rounded-lg"
            >
              <Plus size={14} /> Create workflow
            </button>
          </div>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((w) => (
            <div
              key={w.id}
              className="bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] rounded-xl p-5 hover:border-[hsl(var(--border-strong))] transition-colors cursor-pointer group"
              onClick={() => { setEditingWorkflow(w); setShowBuilder(true); }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} className={w.active ? "text-[hsl(var(--accent-green))]" : "text-foreground-muted"} />
                  <span className="text-[13px] font-medium text-foreground truncate max-w-[180px]">{w.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => toggleActive(w)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
                    {w.active ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button onClick={() => duplicateWorkflow(w)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
                    <Copy size={12} />
                  </button>
                  <button onClick={() => deleteWorkflow(w.id)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Steps preview */}
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {w.steps.slice(0, 5).map((s, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 bg-[hsl(var(--background-elevated))] rounded-md text-[10px] text-foreground-secondary">
                    <StepIcon type={s.type} />
                    <span className="truncate max-w-[60px]">{s.label}</span>
                  </span>
                ))}
                {w.steps.length > 5 && <span className="text-[10px] text-foreground-muted">+{w.steps.length - 5}</span>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${w.active ? "bg-[hsl(var(--accent-green))]/10 text-[hsl(var(--accent-green))]" : "bg-[hsl(var(--background-elevated))] text-foreground-muted"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${w.active ? "bg-[hsl(var(--accent-green))]" : "bg-foreground-muted"}`} />
                    {w.active ? "Active" : "Paused"}
                  </span>
                  {w.trigger && (
                    <span className="text-[10px] text-foreground-muted">
                      {TRIGGERS.find((t) => t.value === w.trigger)?.label}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-foreground-muted">{w.runs_count} runs</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[hsl(var(--background-elevated))] border-b border-[hsl(var(--border))]">
                {["Name", "Trigger", "Steps", "Status", "Runs", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[11px] text-foreground-secondary uppercase tracking-[0.08em] px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr
                  key={w.id}
                  className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--background-secondary))] cursor-pointer"
                  onClick={() => { setEditingWorkflow(w); setShowBuilder(true); }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Zap size={12} className={w.active ? "text-[hsl(var(--accent-green))]" : "text-foreground-muted"} />
                      <span className="text-[13px] font-medium text-foreground">{w.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground-secondary">{TRIGGERS.find((t) => t.value === w.trigger)?.label ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-foreground-secondary">{w.steps.length} step{w.steps.length !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${w.active ? "bg-[hsl(var(--accent-green))]/10 text-[hsl(var(--accent-green))]" : "bg-[hsl(var(--background-elevated))] text-foreground-muted"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${w.active ? "bg-[hsl(var(--accent-green))]" : "bg-foreground-muted"}`} />
                      {w.active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground-secondary">{w.runs_count}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleActive(w)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
                        {w.active ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                      <button onClick={() => duplicateWorkflow(w)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
                        <Copy size={12} />
                      </button>
                      <button onClick={() => deleteWorkflow(w.id)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Builder modal */}
      {showBuilder && (
        <WorkflowBuilderModal
          workflow={editingWorkflow}
          onClose={() => { setShowBuilder(false); setEditingWorkflow(null); }}
          onSave={handleSave}
        />
      )}

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowTemplates(false)}>
          <div
            className="w-full max-w-[640px] max-h-[80vh] bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Workflow Templates</h2>
                <p className="text-[11px] text-foreground-secondary mt-0.5">Pre-built automations — click to create instantly</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex flex-col gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => createFromTemplate(tpl)}
                  className="flex items-start gap-3 w-full text-left p-4 rounded-xl bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] flex items-center justify-center text-foreground-secondary shrink-0 mt-0.5">
                    {tpl.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{tpl.name}</p>
                    <p className="text-[11px] text-foreground-secondary mt-0.5">{tpl.desc}</p>
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {tpl.steps.map((s, i) => (
                        <span key={i} className="flex items-center gap-1 px-1.5 py-0.5 bg-[hsl(var(--background-card))] rounded text-[9px] text-foreground-muted">
                          <StepIcon type={s.type} />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-foreground-muted shrink-0">{tpl.steps.length} steps</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;
