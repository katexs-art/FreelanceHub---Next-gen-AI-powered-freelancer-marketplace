import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Phone, Users, CalendarCheck, DollarSign, TrendingDown, Plus, Workflow, Inbox, Sparkles,
  Send, UserPlus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRiverChat } from "@/hooks/useRiverChat";
import { AddContactModal } from "@/components/dashboard/AddContactModal";
import { Badge } from "@/components/ui/badge";

/* ─── helpers ─── */
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function initials(first: string, last?: string | null) {
  return (first[0] + (last?.[0] || "")).toUpperCase();
}

const statusColor: Record<string, string> = {
  hot: "green", booked: "purple", won: "green", cold: "default", lost: "destructive", new: "white", warm: "default",
};

const activityDot: Record<string, string> = {
  call: "bg-blue-400", sms: "bg-amber-400", email: "bg-amber-400", chat: "bg-accent-green", note: "bg-foreground-muted",
};

function Delta({ value, negative }: { value: number; negative?: boolean }) {
  if (value === 0) return <span className="text-[11px] text-foreground-muted">No change</span>;
  const color = negative ? "text-[#f09595]" : value > 0 ? "text-accent-green" : "text-[#f09595]";
  return <span className={`text-[11px] ${color}`}>{value > 0 ? "+" : ""}{value} vs yesterday</span>;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-background-elevated rounded-md animate-pulse ${className}`} />;
}

/* ─── component ─── */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { metrics, profile, contacts, activities, deals, loading, refetch } = useDashboardData();
  const river = useRiverChat();
  const [addOpen, setAddOpen] = useState(false);
  const [riverInput, setRiverInput] = useState("");
  const riverRef = useRef<HTMLInputElement>(null);

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Fetch River greeting when metrics load
  useEffect(() => {
    if (metrics && !river.greeting) {
      river.fetchGreeting({
        userName: firstName,
        businessName: profile?.business_name || undefined,
        industry: profile?.industry || undefined,
        date: dateStr,
        callsToday: metrics.callsToday,
        newLeads: metrics.newLeads,
        booked: metrics.booked,
        wonThisWeek: metrics.wonThisWeek,
        lostThisWeek: metrics.lostThisWeek,
      });
    }
  }, [metrics]);

  const riverContext = {
    userName: firstName,
    businessName: profile?.business_name || undefined,
    industry: profile?.industry || undefined,
    date: dateStr,
    callsToday: metrics?.callsToday ?? 0,
    newLeads: metrics?.newLeads ?? 0,
    booked: metrics?.booked ?? 0,
    wonThisWeek: metrics?.wonThisWeek ?? 0,
    lostThisWeek: metrics?.lostThisWeek ?? 0,
  };

  const handleRiverSend = () => {
    if (!riverInput.trim()) return;
    river.sendMessage(riverInput, riverContext);
    setRiverInput("");
  };

  // Deal stage counts
  const stageGroups = ["new", "hot", "booked", "won", "lost"].map((stage) => ({
    stage,
    deals: deals.filter((d) => d.stage === stage),
  }));

  // ROI stats
  const riverCalls = activities.filter((a) => a.type === "call" && a.description?.toLowerCase().includes("river")).length;
  const riverDeals = deals.filter((d) => d.stage === "won" && d.title?.toLowerCase().includes("river"));
  const revenueRecovered = riverDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const timeSaved = riverCalls * 4;

  const metricsData = metrics ? [
    { label: "Calls today", value: metrics.callsToday, delta: metrics.callsToday - metrics.callsYesterday, icon: Phone },
    { label: "New leads", value: metrics.newLeads, delta: metrics.newLeads - metrics.newLeadsYesterday, icon: Users },
    { label: "Booked", value: metrics.booked, delta: metrics.booked - metrics.bookedYesterday, icon: CalendarCheck },
    { label: "Won this week", value: `$${metrics.wonThisWeek.toLocaleString()}`, delta: metrics.wonThisWeek - metrics.wonLastWeek, icon: DollarSign },
    { label: "Lost this week", value: metrics.lostThisWeek, delta: metrics.lostThisWeek - metrics.lostLastWeek, icon: TrendingDown, negative: true },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div>
        <h2 className="text-[20px] font-bold text-foreground tracking-[-0.02em]">
          {greeting}, {firstName}
        </h2>
        <p className="text-small text-foreground-secondary flex items-center gap-2 mt-0.5">
          {dateStr}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-accent-green" />
            River is active
          </span>
        </p>
      </div>

      {/* SECTION 1 — Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[88px]" />)
          : metricsData.map((m) => (
              <div key={m.label} className="bg-background-card border border-border rounded-[10px] p-4">
                <p className="text-label text-foreground-secondary tracking-[0.08em] uppercase">{m.label}</p>
                <p className="text-h2 font-bold text-foreground tracking-[-0.03em] mt-1">
                  {typeof m.value === "number" ? m.value : m.value}
                </p>
                <Delta value={m.delta} negative={m.negative} />
              </div>
            ))}
      </div>

      {/* SECTION 2 — River AI Widget */}
      <div className="rounded-[10px] p-4" style={{ background: "rgba(127,119,221,0.06)", border: "1px solid rgba(127,119,221,0.15)", borderTop: "2px solid #7F77DD" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-accent-purple" />
          <span className="text-[13px] font-semibold" style={{ color: "#AFA9EC" }}>River AI</span>
          <Badge variant="green" className="text-[10px] px-1.5 py-0">Online</Badge>
          <span className="flex-1" />
          <button className="text-[11px] text-foreground-secondary border border-border rounded-sm px-2 py-1 hover:border-border-strong">
            River is ON
          </button>
        </div>

        <div className="text-[13px] min-h-[40px]" style={{ color: "#c8c7c2" }}>
          {river.isLoading && !river.greeting ? (
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" /> Thinking...</div>
          ) : (
            river.greeting || "Loading your morning briefing..."
          )}
        </div>

        {river.tip && (
          <div className="mt-3 rounded-md px-3.5 py-2.5 text-[11px] text-accent-green" style={{ background: "rgba(74,222,128,0.05)", borderLeft: "2px solid hsl(var(--accent-green))" }}>
            {river.tip}
          </div>
        )}

        {/* Chat messages */}
        {river.messages.length > 0 && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {river.messages.map((m, i) => (
              <div key={i} className={`text-[13px] ${m.role === "user" ? "text-foreground" : "text-foreground-secondary"}`}>
                <span className="text-label text-foreground-muted mr-2">{m.role === "user" ? "You" : "River"}</span>
                {m.content}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <input
            ref={riverRef}
            value={riverInput}
            onChange={(e) => setRiverInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRiverSend()}
            placeholder="Ask River anything about your business..."
            className="flex-1 h-9 bg-background-elevated/50 border border-border rounded-md px-3 text-small text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-strong"
          />
          <button
            onClick={handleRiverSend}
            disabled={river.isLoading}
            className="w-7 h-7 rounded-sm bg-foreground text-background flex items-center justify-center hover:opacity-90 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 3 — Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Recent Contacts */}
          <div className="bg-background-card border border-border rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-foreground">Recent contacts</h3>
              <Link to="/contacts" className="text-[11px] text-foreground-secondary hover:text-foreground">View all →</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-small text-foreground-secondary mb-3">No contacts yet. Add your first contact.</p>
                <button onClick={() => setAddOpen(true)} className="w-8 h-8 rounded-full bg-background-elevated border border-border flex items-center justify-center text-foreground-secondary hover:text-foreground mx-auto">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-background-elevated/50">
                    <div className="w-7 h-7 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[10px] font-medium text-foreground-secondary shrink-0">
                      {initials(c.first_name, c.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-small text-foreground truncate">{c.first_name} {c.last_name || ""}</p>
                      <p className="text-[10px] text-foreground-muted">{c.source || "No source"} · {timeAgo(c.created_at)}</p>
                    </div>
                    <Badge variant={statusColor[c.status] as any || "default"} className="text-[9px] capitalize">{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="bg-background-card border border-border rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[13px] font-semibold text-foreground">Activity feed</h3>
              <span className="w-[5px] h-[5px] rounded-full bg-accent-green" />
              <span className="text-[10px] text-accent-green">Live</span>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : activities.length === 0 ? (
              <p className="text-small text-foreground-secondary py-4 text-center">No activity yet.</p>
            ) : (
              <div className="space-y-1">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${activityDot[a.type] || "bg-foreground-muted"}`} />
                    <p className="flex-1 text-small text-foreground-secondary truncate">{a.description || `${a.type} activity`}</p>
                    <span className="text-[10px] text-foreground-muted shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Pipeline Snapshot */}
          <div className="bg-background-card border border-border rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-foreground">Pipeline</h3>
              <Link to="/pipeline" className="text-[11px] text-foreground-secondary hover:text-foreground">View all →</Link>
            </div>
            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <>
                <div className="grid grid-cols-5 gap-1.5">
                  {stageGroups.map((sg) => (
                    <div key={sg.stage} className="text-center">
                      <p className="text-[9px] text-foreground-muted uppercase tracking-wider mb-1">{sg.stage}</p>
                      <span className="text-[10px] bg-background-elevated rounded-full px-1.5 py-0.5 text-foreground-secondary">{sg.deals.length}</span>
                      <div className="mt-2 space-y-1">
                        {sg.deals.slice(0, 2).map((d) => (
                          <div key={d.id} className="bg-background-elevated rounded-[7px] p-2 text-left">
                            <p className="text-[10px] text-foreground truncate">{d.title}</p>
                            {Number(d.value) > 0 && <p className="text-[9px] text-foreground-secondary">${Number(d.value).toLocaleString()}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/pipeline" className="block text-[11px] text-foreground-secondary hover:text-foreground mt-3 text-center">View full pipeline →</Link>
              </>
            )}
          </div>

          {/* ROI Tracker */}
          <div className="bg-background-card border border-border rounded-[10px] p-4">
            <h3 className="text-[13px] font-semibold text-foreground mb-3">River ROI this month</h3>
            <div className="space-y-3">
              <div>
                <p className="text-h2 font-bold text-foreground">{riverCalls}</p>
                <p className="text-small text-foreground-secondary">Calls handled by River</p>
              </div>
              <div>
                <p className="text-h2 font-bold text-foreground">${revenueRecovered.toLocaleString()}</p>
                <p className="text-small text-foreground-secondary">Revenue recovered</p>
              </div>
              <div>
                <p className="text-h2 font-bold text-foreground">{timeSaved} min</p>
                <p className="text-small text-foreground-secondary">Time saved</p>
              </div>
            </div>
            <div className="mt-4 rounded-md px-3 py-2 text-[11px] text-accent-green" style={{ background: "rgba(74,222,128,0.05)" }}>
              River has saved you approximately {Math.round(timeSaved / 60)} hours this month
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 — Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { label: "Add contact", icon: UserPlus, action: () => setAddOpen(true) },
          { label: "New workflow", icon: Workflow, action: () => navigate("/workflows") },
          { label: "View inbox", icon: Inbox, action: () => navigate("/inbox") },
          { label: "Ask River", icon: Sparkles, action: () => riverRef.current?.focus(), purple: true },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`bg-background-card border border-border rounded-[10px] p-4 text-left hover:border-border-strong transition-colors cursor-pointer group ${item.purple ? "border-accent-purple/20" : ""}`}
          >
            <item.icon className={`w-4 h-4 mb-2 ${item.purple ? "text-accent-purple" : "text-foreground-secondary"} group-hover:text-foreground`} />
            <p className="text-small text-foreground">{item.label}</p>
          </button>
        ))}
      </div>

      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={refetch} />
    </div>
  );
};

export default Dashboard;
