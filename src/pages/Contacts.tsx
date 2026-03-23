import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Modal, ModalContent } from "@/components/ui/modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Search, Filter, Upload, Plus, MoreHorizontal, Phone, Mail, MessageSquare, StickyNote, ChevronUp, ChevronDown, X, FileText, Trash2 } from "lucide-react";
import { RiverContactInsight } from "@/components/river/RiverContactInsight";
import { buildBusinessContext } from "@/services/river";
import type { Tables } from "@/integrations/supabase/types";

type Contact = Tables<"contacts">;
type StatusFilter = "all" | "new" | "hot" | "warm" | "cold" | "booked" | "won" | "lost" | "today" | "week";

const statusColors: Record<string, string> = {
  new: "border border-border-strong text-foreground",
  hot: "bg-accent-green/20 text-accent-green",
  warm: "bg-amber-500/20 text-amber-400",
  cold: "bg-foreground-muted/30 text-foreground-secondary",
  booked: "bg-blue-500/20 text-blue-400",
  won: "bg-accent-green text-primary-foreground",
  lost: "bg-destructive/20 text-destructive",
};

const sourceColors: Record<string, string> = {
  "Facebook Ads": "bg-blue-500/15 text-blue-400",
  Facebook: "bg-blue-500/15 text-blue-400",
  Google: "bg-accent-green/15 text-accent-green",
  Referral: "bg-accent-purple/15 text-accent-purple",
  Website: "bg-foreground-muted/20 text-foreground-secondary",
  "Cold outreach": "bg-foreground-muted/20 text-foreground-secondary",
  Other: "bg-foreground-muted/20 text-foreground-secondary",
};

const sources = ["Facebook Ads", "Google", "Referral", "Website", "Cold outreach", "Other"];
const allStatuses = ["new", "hot", "warm", "cold", "booked", "won", "lost"] as const;

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const Contacts = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<"name" | "status" | "created_at" | "updated_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [activities, setActivities] = useState<Tables<"activities">[]>([]);
  const [deals, setDeals] = useState<Tables<"deals">[]>([]);
  const [noteText, setNoteText] = useState("");

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Real-time
  useEffect(() => {
    const ch = supabase.channel("contacts-rt").on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => fetchContacts()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchContacts]);

  // Load detail data
  useEffect(() => {
    if (!detailContact || !user) return;
    supabase.from("activities").select("*").eq("user_id", user.id).eq("contact_id", detailContact.id).order("created_at", { ascending: false }).then(({ data }) => setActivities(data || []));
    supabase.from("deals").select("*").eq("user_id", user.id).eq("contact_id", detailContact.id).order("created_at", { ascending: false }).then(({ data }) => setDeals(data || []));
  }, [detailContact, user]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (filter === "today") {
      const today = new Date().toDateString();
      list = list.filter((c) => new Date(c.created_at).toDateString() === today);
    } else if (filter === "week") {
      const weekAgo = Date.now() - 7 * 86400000;
      list = list.filter((c) => new Date(c.created_at).getTime() > weekAgo);
    } else if (filter !== "all") {
      list = list.filter((c) => c.status === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => `${c.first_name} ${c.last_name || ""} ${c.email || ""} ${c.phone || ""}`.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let av: string, bv: string;
      if (sortCol === "name") { av = a.first_name; bv = b.first_name; }
      else if (sortCol === "status") { av = a.status; bv = b.status; }
      else if (sortCol === "updated_at") { av = a.updated_at; bv = b.updated_at; }
      else { av = a.created_at; bv = b.created_at; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [contacts, filter, search, sortCol, sortDir]);

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)));

  const deleteContact = async (id: string) => {
    await supabase.from("contacts").delete().eq("id", id);
    toast({ title: "Contact deleted" });
    fetchContacts();
    setActionMenu(null);
    if (detailContact?.id === id) setDetailContact(null);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("contacts").update({ status: status as any }).eq("id", id);
    fetchContacts();
    setActionMenu(null);
  };

  const bulkDelete = async () => {
    for (const id of selected) await supabase.from("contacts").delete().eq("id", id);
    setSelected(new Set());
    fetchContacts();
    toast({ title: `${selected.size} contacts deleted` });
  };

  const addNote = async () => {
    if (!noteText.trim() || !detailContact || !user) return;
    await supabase.from("activities").insert({ user_id: user.id, contact_id: detailContact.id, type: "note" as const, description: noteText });
    setNoteText("");
    const { data } = await supabase.from("activities").select("*").eq("user_id", user.id).eq("contact_id", detailContact.id).order("created_at", { ascending: false });
    setActivities(data || []);
    toast({ title: "Note added" });
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" }, { key: "new", label: "New" }, { key: "hot", label: "Hot" }, { key: "warm", label: "Warm" },
    { key: "cold", label: "Cold" }, { key: "booked", label: "Booked" }, { key: "won", label: "Won" }, { key: "lost", label: "Lost" },
    { key: "today", label: "Today" }, { key: "week", label: "This week" },
  ];

  const SortIcon = ({ col }: { col: typeof sortCol }) => (
    <span className="inline-flex flex-col ml-1 -space-y-1">
      <ChevronUp className={`h-2.5 w-2.5 ${sortCol === col && sortDir === "asc" ? "text-foreground" : "text-foreground-muted"}`} />
      <ChevronDown className={`h-2.5 w-2.5 ${sortCol === col && sortDir === "desc" ? "text-foreground" : "text-foreground-muted"}`} />
    </span>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-[-0.03em]">Contacts</h1>
          <p className="text-[13px] text-foreground-secondary">{contacts.length} contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-secondary" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." className="w-[240px] h-9 pl-8 text-[12px] bg-background-elevated border-border" />
          </div>
          <Button variant="ghost" size="sm" className="h-9"><Filter className="h-3.5 w-3.5 mr-1" /> Filter</Button>
          <Button variant="ghost" size="sm" className="h-9" onClick={() => setImportOpen(true)}><Upload className="h-3.5 w-3.5 mr-1" /> Import</Button>
          <Button size="sm" className="h-9" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add contact</Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors ${filter === f.key ? "bg-foreground text-primary-foreground" : "bg-background-elevated text-foreground-secondary border border-border hover:text-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-background-elevated border-b border-border">
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="w-3.5 h-3.5 rounded bg-background-elevated border border-border-strong accent-foreground" /></th>
                <th className="text-left px-4 py-3 text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium cursor-pointer" onClick={() => toggleSort("name")}>Name <SortIcon col="name" /></th>
                <th className="text-left px-4 py-3 text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">Email</th>
                <th className="text-left px-4 py-3 text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">Source</th>
                <th className="text-left px-4 py-3 text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium cursor-pointer" onClick={() => toggleSort("status")}>Status <SortIcon col="status" /></th>
                <th className="text-left px-4 py-3 text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium cursor-pointer" onClick={() => toggleSort("updated_at")}>Last activity <SortIcon col="updated_at" /></th>
                <th className="text-left px-4 py-3 text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium cursor-pointer" onClick={() => toggleSort("created_at")}>Added <SortIcon col="created_at" /></th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-background-elevated rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-foreground-secondary text-[13px]">No contacts yet. Add your first contact.</td></tr>
              ) : (
                filtered.map((c) => {
                  const initials = `${c.first_name[0]}${(c.last_name || "")[0] || ""}`.toUpperCase();
                  return (
                    <tr key={c.id} className="border-b border-border/30 hover:bg-background-card/80 cursor-pointer transition-colors" onClick={() => setDetailContact(c)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-3.5 h-3.5 rounded bg-background-elevated border border-border-strong accent-foreground" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[10px] font-medium text-foreground shrink-0">{initials}</div>
                          <span className="text-[13px] font-medium text-foreground">{c.first_name} {c.last_name || ""}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{c.phone ? <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="text-[12px] text-foreground/70 hover:text-foreground">{c.phone}</a> : <span className="text-[12px] text-foreground-muted">—</span>}</td>
                      <td className="px-4 py-3">{c.email ? <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-[12px] text-foreground/70 hover:text-foreground truncate max-w-[160px] block">{c.email}</a> : <span className="text-[12px] text-foreground-muted">—</span>}</td>
                      <td className="px-4 py-3">{c.source ? <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sourceColors[c.source] || sourceColors.Other}`}>{c.source}</span> : <span className="text-[12px] text-foreground-muted">—</span>}</td>
                      <td className="px-4 py-3"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[c.status]}`}>{c.status}</span></td>
                      <td className="px-4 py-3 text-[12px] text-foreground-secondary">{timeAgo(c.updated_at)}</td>
                      <td className="px-4 py-3 text-[12px] text-foreground-secondary">{fmtDate(c.created_at)}</td>
                      <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActionMenu(actionMenu === c.id ? null : c.id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-elevated text-foreground-secondary">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        {actionMenu === c.id && (
                          <div className="absolute right-4 top-10 bg-background-card border border-border rounded-md py-1 z-20 min-w-[160px]">
                            <button onClick={() => { setDetailContact(c); setActionMenu(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-foreground hover:bg-background-elevated">View</button>
                            <button onClick={() => { setEditContact(c); setActionMenu(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-foreground hover:bg-background-elevated">Edit</button>
                            <button onClick={() => updateStatus(c.id, "won")} className="w-full text-left px-3 py-1.5 text-[11px] text-accent-green hover:bg-background-elevated">Mark as won</button>
                            <button onClick={() => updateStatus(c.id, "lost")} className="w-full text-left px-3 py-1.5 text-[11px] text-destructive hover:bg-background-elevated">Mark as lost</button>
                            <button onClick={() => deleteContact(c.id)} className="w-full text-left px-3 py-1.5 text-[11px] text-destructive hover:bg-background-elevated">Delete</button>
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

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="bg-background-card border-t border-border-subtle px-4 py-3 flex items-center gap-3">
            <span className="text-[12px] text-foreground-secondary font-medium">{selected.size} selected</span>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]"><MessageSquare className="h-3 w-3 mr-1" /> Send SMS</Button>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]"><Mail className="h-3 w-3 mr-1" /> Send email</Button>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]">Add to workflow</Button>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]">Export</Button>
            <Button variant="destructive" size="sm" className="h-7 text-[11px]" onClick={bulkDelete}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
          </div>
        )}
      </div>

      {/* Contact Detail Modal */}
      <Modal open={!!detailContact} onOpenChange={(v) => { if (!v) setDetailContact(null); }}>
        <ModalContent className="max-w-[800px]">
          {detailContact && (
            <div className="flex gap-6 max-h-[70vh]">
              {/* Left */}
              <div className="w-[280px] shrink-0">
                <div className="flex flex-col items-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[18px] font-semibold text-foreground mb-2">
                    {`${detailContact.first_name[0]}${(detailContact.last_name || "")[0] || ""}`.toUpperCase()}
                  </div>
                  <h2 className="text-[20px] font-bold text-foreground">{detailContact.first_name} {detailContact.last_name || ""}</h2>
                  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize mt-1 ${statusColors[detailContact.status]}`}>{detailContact.status}</span>
                </div>
                <div className="flex gap-1.5 mb-5 justify-center">
                  {[{ icon: Phone, label: "Call" }, { icon: MessageSquare, label: "SMS" }, { icon: Mail, label: "Email" }, { icon: StickyNote, label: "Note" }].map(({ icon: Icon, label }) => (
                    <Button key={label} variant="ghost" size="sm" className="h-7 text-[10px] px-2"><Icon className="h-3 w-3 mr-1" />{label}</Button>
                  ))}
                </div>
                <div className="space-y-2.5 text-[12px]">
                  {detailContact.phone && <div className="flex justify-between"><span className="text-foreground-secondary">Phone</span><a href={`tel:${detailContact.phone}`} className="text-foreground hover:underline">{detailContact.phone}</a></div>}
                  {detailContact.email && <div className="flex justify-between"><span className="text-foreground-secondary">Email</span><a href={`mailto:${detailContact.email}`} className="text-foreground hover:underline truncate ml-2">{detailContact.email}</a></div>}
                  {detailContact.source && <div className="flex justify-between"><span className="text-foreground-secondary">Source</span><span className="text-foreground">{detailContact.source}</span></div>}
                  <div className="flex justify-between"><span className="text-foreground-secondary">Added</span><span className="text-foreground">{fmtDate(detailContact.created_at)}</span></div>
                </div>
                {/* River score */}
                <div className="mt-5 bg-accent-purple/[0.05] border border-accent-purple/10 rounded-md p-3">
                  <span className="text-[10px] font-medium text-accent-purple uppercase tracking-[0.1em]">River Insights</span>
                  <div className="mt-2">
                    <RiverContactInsight
                      contactData={`${detailContact.first_name} ${detailContact.last_name || ""}, status: ${detailContact.status}, source: ${detailContact.source || "unknown"}, created: ${detailContact.created_at}`}
                      context={buildBusinessContext({ full_name: user?.email })}
                    />
                  </div>
                </div>
              </div>
              {/* Right */}
              <div className="flex-1 min-w-0 overflow-auto">
                <Tabs defaultValue="activity">
                  <TabsList className="bg-background-elevated border border-border mb-3">
                    <TabsTrigger value="activity" className="text-[11px]">Activity</TabsTrigger>
                    <TabsTrigger value="deals" className="text-[11px]">Deals</TabsTrigger>
                    <TabsTrigger value="notes" className="text-[11px]">Notes</TabsTrigger>
                    <TabsTrigger value="files" className="text-[11px]">Files</TabsTrigger>
                  </TabsList>
                  <TabsContent value="activity">
                    <ScrollArea className="h-[350px]">
                      {activities.length === 0 ? <p className="text-[12px] text-foreground-secondary py-4">No activity yet.</p> : (
                        <div className="space-y-3">
                          {activities.map((a) => (
                            <div key={a.id} className="flex items-start gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.type === "call" ? "bg-blue-400" : a.type === "email" ? "bg-amber-400" : a.type === "sms" ? "bg-accent-green" : "bg-foreground-muted"}`} />
                              <div>
                                <p className="text-[11px] text-foreground/80">{a.description}</p>
                                <p className="text-[10px] text-foreground-secondary">{timeAgo(a.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="deals">
                    <ScrollArea className="h-[350px]">
                      {deals.length === 0 ? <p className="text-[12px] text-foreground-secondary py-4">No deals yet.</p> : (
                        <div className="space-y-2">
                          {deals.map((d) => (
                            <div key={d.id} className="bg-background-elevated rounded-md p-3 border border-border">
                              <div className="text-[13px] font-medium text-foreground">{d.title}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[12px] text-foreground-secondary">${Number(d.value || 0).toLocaleString()}</span>
                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full capitalize ${statusColors[d.stage]}`}>{d.stage}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="notes">
                    <div className="flex gap-2 mb-3">
                      <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." className="min-h-[50px] resize-none text-[11px] bg-background-elevated border-border" />
                      <Button size="sm" className="h-8 self-end" onClick={addNote} disabled={!noteText.trim()}>Add</Button>
                    </div>
                    <ScrollArea className="h-[280px]">
                      <div className="space-y-2">
                        {activities.filter((a) => a.type === "note").map((a) => (
                          <div key={a.id} className="bg-background-elevated rounded-md p-2.5 border border-border">
                            <p className="text-[11px] text-foreground/70">{a.description}</p>
                            <p className="text-[10px] text-foreground-secondary mt-1">{timeAgo(a.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="files">
                    <div className="border-2 border-dashed border-border rounded-md p-8 text-center mb-3">
                      <FileText className="h-6 w-6 text-foreground-muted mx-auto mb-2" />
                      <p className="text-[12px] text-foreground-secondary">Drop files or click to upload</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Add/Edit Contact Modal */}
      <ContactFormModal open={addOpen || !!editContact} onClose={() => { setAddOpen(false); setEditContact(null); }} contact={editContact} onSaved={fetchContacts} />

      {/* Import Modal */}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={fetchContacts} />
    </div>
  );
};

// ── Contact Form Modal ──
function ContactFormModal({ open, onClose, contact, onSaved }: { open: boolean; onClose: () => void; contact: Contact | null; onSaved: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", source: "", status: "new", notes: "" });

  useEffect(() => {
    if (contact) setForm({ first_name: contact.first_name, last_name: contact.last_name || "", email: contact.email || "", phone: contact.phone || "", source: contact.source || "", status: contact.status, notes: contact.notes || "" });
    else setForm({ first_name: "", last_name: "", email: "", phone: "", source: "", status: "new", notes: "" });
  }, [contact, open]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!user || !form.first_name.trim()) return;
    setSaving(true);
    const payload = { first_name: form.first_name, last_name: form.last_name || null, email: form.email || null, phone: form.phone || null, source: form.source || null, status: form.status as any, notes: form.notes || null };
    if (contact) {
      await supabase.from("contacts").update(payload).eq("id", contact.id);
    } else {
      await supabase.from("contacts").insert({ ...payload, user_id: user.id });
      await supabase.from("activities").insert({ user_id: user.id, type: "note" as const, description: `Added contact: ${form.first_name} ${form.last_name}`.trim() });
    }
    onSaved();
    onClose();
    toast({ title: contact ? "Contact updated" : "Contact added" });
    setSaving(false);
  };

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <ModalContent>
        <h3 className="text-[16px] font-semibold text-foreground mb-4">{contact ? "Edit contact" : "Add contact"}</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input placeholder="First name *" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
          <Input placeholder="Last name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select value={form.source} onChange={(e) => set("source", e.target.value)} className="h-10 bg-background-elevated border border-border rounded-md px-3 text-[12px] text-foreground focus:outline-none focus:border-ring">
            <option value="">Source</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className="h-10 bg-background-elevated border border-border rounded-md px-3 text-[12px] text-foreground focus:outline-none focus:border-ring">
            {allStatuses.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <Textarea placeholder="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-[60px] resize-none text-[12px] bg-background-elevated border-border mb-4" />
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.first_name.trim()}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

// ── Import Modal ──
function ImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(Boolean).map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
      setPreview(lines.slice(0, 6));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file || !user || preview.length < 2) return;
    setImporting(true);
    const headers = preview[0].map((h) => h.toLowerCase());
    const rows = preview.slice(1);
    const fnIdx = headers.findIndex((h) => h.includes("first"));
    const lnIdx = headers.findIndex((h) => h.includes("last"));
    const emIdx = headers.findIndex((h) => h.includes("email"));
    const phIdx = headers.findIndex((h) => h.includes("phone"));

    // Re-read full file
    const text = await file.text();
    const allRows = text.split("\n").filter(Boolean).slice(1);
    let done = 0;
    for (const line of allRows) {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const firstName = cols[fnIdx >= 0 ? fnIdx : 0];
      if (!firstName) continue;
      await supabase.from("contacts").insert({
        user_id: user.id,
        first_name: firstName,
        last_name: lnIdx >= 0 ? cols[lnIdx] || null : null,
        email: emIdx >= 0 ? cols[emIdx] || null : null,
        phone: phIdx >= 0 ? cols[phIdx] || null : null,
      });
      done++;
      setProgress(Math.round((done / allRows.length) * 100));
    }
    toast({ title: `${done} contacts imported successfully` });
    setImporting(false);
    onDone();
    onClose();
    setFile(null);
    setPreview([]);
    setProgress(0);
  };

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) { onClose(); setFile(null); setPreview([]); } }}>
      <ModalContent>
        <h3 className="text-[16px] font-semibold text-foreground mb-4">Import contacts</h3>
        {!file ? (
          <label className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer block hover:border-border-strong transition-colors">
            <Upload className="h-8 w-8 text-foreground-muted mx-auto mb-2" />
            <p className="text-[13px] text-foreground-secondary">Drop a CSV file here or click to browse</p>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        ) : (
          <>
            <p className="text-[12px] text-foreground-secondary mb-2">{file.name} — Preview:</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-[11px]">
                <thead><tr className="bg-background-elevated">{preview[0]?.map((h, i) => <th key={i} className="px-2 py-1 text-left text-foreground-secondary">{h}</th>)}</tr></thead>
                <tbody>{preview.slice(1).map((row, i) => <tr key={i} className="border-t border-border/30">{row.map((c, j) => <td key={j} className="px-2 py-1 text-foreground/70">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
            {importing && <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden mb-3"><div className="h-full bg-accent-green rounded-full transition-all" style={{ width: `${progress}%` }} /></div>}
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => { setFile(null); setPreview([]); }}>Cancel</Button>
              <Button onClick={handleImport} disabled={importing}>{importing ? `Importing... ${progress}%` : "Import"}</Button>
            </div>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default Contacts;
