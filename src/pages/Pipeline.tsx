import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Modal, ModalContent } from "@/components/ui/modal";
import { toast } from "@/hooks/use-toast";
import { Plus, MoreHorizontal, GripVertical, List, LayoutGrid, Trash2 } from "lucide-react";
import { RiverPipelineInsight } from "@/components/river/RiverPipelineInsight";
import { buildBusinessContext } from "@/services/river";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals">;
type Contact = Tables<"contacts">;
type Stage = "new" | "hot" | "booked" | "won" | "lost";

const STAGES: Stage[] = ["new", "hot", "booked", "won", "lost"];
const stageLabels: Record<Stage, string> = { new: "New", hot: "Hot", booked: "Booked", won: "Won", lost: "Lost" };
const stageColors: Record<Stage, string> = {
  new: "border border-border-strong text-foreground",
  hot: "bg-accent-green/20 text-accent-green",
  booked: "bg-blue-500/20 text-blue-400",
  won: "bg-accent-green text-primary-foreground",
  lost: "bg-destructive/20 text-destructive",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Pipeline = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [addOpen, setAddOpen] = useState(false);
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [riverInsight, setRiverInsight] = useState<string | null>(null);
  const [showRiver, setShowRiver] = useState(true);
  const [confirmMove, setConfirmMove] = useState<{ deal: Deal; to: Stage } | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("deals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").eq("user_id", user.id).order("first_name"),
    ]);
    setDeals(d || []);
    setContacts(c || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const ch = supabase.channel("deals-rt").on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => fetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  // River insight
  useEffect(() => {
    if (!deals.length || riverInsight) return;
    const hotStale = deals.filter((d) => d.stage === "hot");
    if (hotStale.length > 0) {
      setRiverInsight(`You have ${hotStale.length} hot deal${hotStale.length > 1 ? "s" : ""} in your pipeline. Want me to send follow-up messages to keep momentum?`);
    }
  }, [deals, riverInsight]);

  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const byStage = useMemo(() => {
    const m: Record<Stage, Deal[]> = { new: [], hot: [], booked: [], won: [], lost: [] };
    for (const d of deals) m[d.stage as Stage]?.push(d);
    return m;
  }, [deals]);

  const totalValue = deals.reduce((s, d) => s + Number(d.value || 0), 0);
  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const avgValue = activeDeals.length ? totalValue / activeDeals.length : 0;
  const wonCount = deals.filter((d) => d.stage === "won").length;
  const winRate = deals.length ? Math.round((wonCount / deals.length) * 100) : 0;
  const thisWeek = deals.filter((d) => d.stage !== "won" && d.stage !== "lost" && Date.now() - new Date(d.updated_at).getTime() < 7 * 86400000).length;

  const moveDeal = async (dealId: string, toStage: Stage) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    // Confirm moving from won/lost back
    if ((deal.stage === "won" || deal.stage === "lost") && toStage !== "won" && toStage !== "lost") {
      setConfirmMove({ deal, to: toStage });
      return;
    }
    await doMove(dealId, toStage);
  };

  const doMove = async (dealId: string, toStage: Stage) => {
    await supabase.from("deals").update({ stage: toStage as any }).eq("id", dealId);
    if (toStage === "won") {
      toast({ title: "🎉 Deal won!", description: "River helped close this deal." });
    }
    fetch();
    setConfirmMove(null);
  };

  const deleteDeal = async (id: string) => {
    await supabase.from("deals").delete().eq("id", id);
    toast({ title: "Deal deleted" });
    fetch();
    setActionMenu(null);
    if (detailDeal?.id === id) setDetailDeal(null);
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, stage: Stage) => { e.preventDefault(); setDragOverStage(stage); };
  const handleDragLeave = () => setDragOverStage(null);
  const handleDrop = (stage: Stage) => { if (dragId) moveDeal(dragId, stage); setDragId(null); setDragOverStage(null); };

  const metrics = [
    { label: "Total pipeline", value: `$${totalValue.toLocaleString()}` },
    { label: "Avg deal value", value: `$${Math.round(avgValue).toLocaleString()}` },
    { label: "Win rate", value: `${winRate}%` },
    { label: "Active this week", value: String(thisWeek) },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-[-0.03em]">Pipeline</h1>
          <p className="text-[13px] text-foreground-secondary">${totalValue.toLocaleString()} in pipeline · {activeDeals.length} active deals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="h-8" onClick={() => setView("list")}><List className="h-3.5 w-3.5 mr-1" /> List</Button>
          <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="h-8" onClick={() => setView("kanban")}><LayoutGrid className="h-3.5 w-3.5 mr-1" /> Board</Button>
          <Button size="sm" className="h-8" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add deal</Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-background-card border border-border rounded-[10px] p-4">
            <span className="text-label uppercase tracking-[0.08em] text-foreground-secondary">{m.label}</span>
            <div className="text-[22px] font-bold text-foreground tracking-[-0.03em] mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      {/* River insight */}
      {showRiver && riverInsight && (
        <div className="bg-accent-purple/[0.06] border border-accent-purple/15 border-t-2 border-t-accent-purple rounded-[10px] p-3 mb-4 flex items-start justify-between">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-purple mt-1.5 shrink-0" />
            <div>
              <span className="text-[12px] font-semibold text-accent-purple">River AI</span>
              <p className="text-[12px] text-foreground/70 mt-0.5">{riverInsight}</p>
              <Button size="sm" className="h-6 text-[10px] mt-2 bg-accent-purple hover:bg-accent-purple/80 text-foreground">Yes, send follow-ups</Button>
            </div>
          </div>
          <button onClick={() => setShowRiver(false)} className="text-foreground-secondary hover:text-foreground text-[11px]">×</button>
        </div>
      )}

      {/* Kanban */}
      {view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = byStage[stage];
            const stageTotal = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
            return (
              <div
                key={stage}
                className={`min-w-[240px] flex-1 bg-background-secondary rounded-[10px] p-3 transition-colors ${dragOverStage === stage ? "border border-border-strong" : "border border-transparent"}`}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(stage)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-foreground">{stageLabels[stage]}</span>
                    <span className="text-[10px] bg-background-elevated text-foreground-secondary px-1.5 py-0.5 rounded-full">{stageDeals.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-foreground-secondary">${stageTotal.toLocaleString()}</span>
                    <button onClick={() => setAddOpen(true)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-background-elevated text-foreground-secondary"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[100px]">
                  {stageDeals.length === 0 ? (
                    <div className="border border-dashed border-border rounded-md p-4 text-center">
                      <p className="text-[11px] text-foreground-muted">No deals here</p>
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const contact = deal.contact_id ? contactMap.get(deal.contact_id) : null;
                      const initials = contact ? `${contact.first_name[0]}${(contact.last_name || "")[0] || ""}`.toUpperCase() : "?";
                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={() => handleDragStart(deal.id)}
                          onClick={() => setDetailDeal(deal)}
                          className={`bg-background-card border border-border rounded-[10px] p-3.5 cursor-grab hover:border-border-strong hover:bg-background-card/90 transition-all ${dragId === deal.id ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[9px] font-medium text-foreground">{initials}</div>
                            <span className="text-[13px] font-medium text-foreground truncate">{contact ? `${contact.first_name} ${contact.last_name || ""}` : "No contact"}</span>
                          </div>
                          <p className="text-[12px] text-foreground-secondary truncate mb-2">{deal.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-semibold text-foreground">${Number(deal.value || 0).toLocaleString()}</span>
                            {contact?.source && <span className="text-[9px] text-foreground-secondary bg-background-elevated px-1.5 py-0.5 rounded-full">{contact.source}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="bg-background-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background-elevated border-b border-border">
                {["Contact", "Deal title", "Value", "Stage", "Source", "Created", "Updated", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-background-elevated rounded animate-pulse" /></td>)}</tr>
                ))
              ) : deals.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-foreground-secondary text-[13px]">No deals yet. Add your first deal.</td></tr>
              ) : (
                deals.map((deal) => {
                  const contact = deal.contact_id ? contactMap.get(deal.contact_id) : null;
                  return (
                    <tr key={deal.id} className="border-b border-border/30 hover:bg-background-card/80 cursor-pointer transition-colors" onClick={() => setDetailDeal(deal)}>
                      <td className="px-4 py-3 text-[13px] font-medium text-foreground">{contact ? `${contact.first_name} ${contact.last_name || ""}` : "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-foreground/80">{deal.title}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-foreground">${Number(deal.value || 0).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${stageColors[deal.stage as Stage]}`}>{deal.stage}</span></td>
                      <td className="px-4 py-3 text-[12px] text-foreground-secondary">{contact?.source || "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-foreground-secondary">{new Date(deal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td className="px-4 py-3 text-[12px] text-foreground-secondary">{timeAgo(deal.updated_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActionMenu(actionMenu === deal.id ? null : deal.id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-elevated text-foreground-secondary">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        {actionMenu === deal.id && (
                          <div className="absolute bg-background-card border border-border rounded-md py-1 z-20 min-w-[140px]">
                            <button onClick={() => { setDetailDeal(deal); setActionMenu(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-foreground hover:bg-background-elevated">View</button>
                            {STAGES.filter((s) => s !== deal.stage).map((s) => (
                              <button key={s} onClick={() => { moveDeal(deal.id, s); setActionMenu(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-foreground hover:bg-background-elevated">Move to {stageLabels[s]}</button>
                            ))}
                            <button onClick={() => deleteDeal(deal.id)} className="w-full text-left px-3 py-1.5 text-[11px] text-destructive hover:bg-background-elevated">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Deal Modal */}
      <AddDealModal open={addOpen} onClose={() => setAddOpen(false)} contacts={contacts} onSaved={fetch} />

      {/* Deal Detail Modal */}
      <Modal open={!!detailDeal} onOpenChange={(v) => { if (!v) setDetailDeal(null); }}>
        <ModalContent className="max-w-[600px]">
          {detailDeal && <DealDetail deal={detailDeal} contact={detailDeal.contact_id ? contactMap.get(detailDeal.contact_id) : undefined} onStageChange={(s) => { doMove(detailDeal.id, s); setDetailDeal(null); }} onDelete={() => { deleteDeal(detailDeal.id); }} />}
        </ModalContent>
      </Modal>

      {/* Confirm move modal */}
      <Modal open={!!confirmMove} onOpenChange={(v) => { if (!v) setConfirmMove(null); }}>
        <ModalContent>
          <h3 className="text-[16px] font-semibold text-foreground mb-2">Move deal back?</h3>
          <p className="text-[13px] text-foreground-secondary mb-4">This deal was marked as {confirmMove?.deal.stage}. Are you sure you want to move it to {confirmMove?.to}?</p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setConfirmMove(null)}>Cancel</Button>
            <Button onClick={() => confirmMove && doMove(confirmMove.deal.id, confirmMove.to)}>Yes, move it</Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
};

// ── Add Deal Modal ──
function AddDealModal({ open, onClose, contacts, onSaved }: { open: boolean; onClose: () => void; contacts: Contact[]; onSaved: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", contact_id: "", value: "", stage: "new" as Stage, notes: "" });
  const [contactSearch, setContactSearch] = useState("");

  useEffect(() => { if (open) setForm({ title: "", contact_id: "", value: "", stage: "new", notes: "" }); }, [open]);

  const filteredContacts = contacts.filter((c) => `${c.first_name} ${c.last_name || ""}`.toLowerCase().includes(contactSearch.toLowerCase()));

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("deals").insert({
      user_id: user.id,
      title: form.title,
      contact_id: form.contact_id || null,
      value: form.value ? parseFloat(form.value) : 0,
      stage: form.stage as any,
    });
    if (!error) {
      await supabase.from("activities").insert({ user_id: user.id, contact_id: form.contact_id || null, type: "note" as const, description: `Created deal: ${form.title}` });
      onSaved();
      onClose();
      toast({ title: "Deal created" });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <ModalContent>
        <h3 className="text-[16px] font-semibold text-foreground mb-4">Add deal</h3>
        <div className="space-y-3">
          <Input placeholder="Deal title *" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          {/* Contact search */}
          <div>
            <Input placeholder="Search contact..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
            {contactSearch && (
              <div className="mt-1 bg-background-card border border-border rounded-md max-h-[120px] overflow-auto">
                {filteredContacts.slice(0, 5).map((c) => (
                  <button key={c.id} onClick={() => { setForm((p) => ({ ...p, contact_id: c.id })); setContactSearch(`${c.first_name} ${c.last_name || ""}`); }} className="w-full text-left px-3 py-1.5 text-[11px] text-foreground hover:bg-background-elevated">
                    {c.first_name} {c.last_name || ""}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input placeholder="Value ($)" type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
          <select value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as Stage }))} className="w-full h-10 bg-background-elevated border border-border rounded-md px-3 text-[12px] text-foreground focus:outline-none focus:border-ring">
            {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="min-h-[50px] resize-none text-[12px] bg-background-elevated border-border" />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

// ── Deal Detail ──
function DealDetail({ deal, contact, onStageChange, onDelete }: { deal: Deal; contact?: Contact; onStageChange: (s: Stage) => void; onDelete: () => void }) {
  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-bold text-foreground">{deal.title}</h2>
          <p className="text-[14px] text-foreground-secondary mt-0.5">
            {contact ? `${contact.first_name} ${contact.last_name || ""}` : "No contact linked"}
          </p>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full capitalize ${stageColors[deal.stage as Stage]}`}>{deal.stage}</span>
      </div>
      <div className="text-[28px] font-bold text-foreground mb-4">${Number(deal.value || 0).toLocaleString()}</div>
      <div className="space-y-2 text-[12px] mb-6">
        <div className="flex justify-between"><span className="text-foreground-secondary">Created</span><span className="text-foreground">{new Date(deal.created_at).toLocaleDateString()}</span></div>
        <div className="flex justify-between"><span className="text-foreground-secondary">Last updated</span><span className="text-foreground">{timeAgo(deal.updated_at)}</span></div>
        {contact?.source && <div className="flex justify-between"><span className="text-foreground-secondary">Source</span><span className="text-foreground">{contact.source}</span></div>}
      </div>
      <div className="mb-4">
        <span className="text-[11px] text-foreground-secondary uppercase tracking-[0.08em] block mb-2">Move to stage</span>
        <div className="flex gap-1.5">
          {STAGES.map((s) => (
            <button key={s} onClick={() => onStageChange(s)} className={`text-[11px] font-medium px-3 py-1 rounded-full capitalize transition-colors ${deal.stage === s ? stageColors[s] : "bg-background-elevated text-foreground-secondary hover:text-foreground"}`}>
              {stageLabels[s]}
            </button>
          ))}
        </div>
      </div>
      <Button variant="destructive" size="sm" className="h-7 text-[11px]" onClick={onDelete}><Trash2 className="h-3 w-3 mr-1" /> Delete deal</Button>
    </div>
  );
}

export default Pipeline;
