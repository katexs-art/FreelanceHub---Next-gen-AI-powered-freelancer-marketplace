import { MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const mockTickets = [
  { id: "TKT-001", client: "James Miller", subject: "Billing issue — double charged", priority: "high", status: "open", assignedTo: "Support Team", created: "2 hr ago", updated: "1 hr ago" },
  { id: "TKT-002", client: "Sarah Rhodes", subject: "Vapi integration not connecting", priority: "medium", status: "in_progress", assignedTo: "Admin", created: "5 hr ago", updated: "3 hr ago" },
  { id: "TKT-003", client: "Tony Kim", subject: "Workflow not triggering on missed call", priority: "medium", status: "open", assignedTo: "Unassigned", created: "1 day ago", updated: "6 hr ago" },
  { id: "TKT-004", client: "Amy Lee", subject: "Feature request: Instagram DM auto-reply", priority: "low", status: "open", assignedTo: "Unassigned", created: "2 days ago", updated: "2 days ago" },
  { id: "TKT-005", client: "Mike Johnson", subject: "Unable to export contacts CSV", priority: "medium", status: "resolved", assignedTo: "Support Team", created: "3 days ago", updated: "1 day ago" },
];

const priorityColors: Record<string, string> = {
  high: "bg-[#f09595]/10 text-[#f09595] border-[#f09595]/20",
  medium: "bg-[#EF9F27]/10 text-[#EF9F27] border-[#EF9F27]/20",
  low: "bg-background-elevated text-foreground-secondary border-border",
};
const statusColors: Record<string, string> = {
  open: "bg-accent-green/10 text-accent-green border-accent-green/20",
  in_progress: "bg-[#85B7EB]/10 text-[#85B7EB] border-[#85B7EB]/20",
  resolved: "bg-background-elevated text-foreground-secondary border-border",
};

export default function AdminSupport() {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? mockTickets : mockTickets.filter((t) => t.status === filter);

  return (
    <div className="space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Support Tickets</h1>
          <p className="text-[12px] text-foreground-secondary mt-0.5">{mockTickets.filter((t) => t.status === "open").length} open · {mockTickets.filter((t) => t.status === "in_progress").length} in progress</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-secondary" />
          <Input placeholder="Search tickets..." className="w-[200px] h-8 pl-8 text-[12px]" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "AVG FIRST RESPONSE", value: "12 min" },
          { label: "AVG RESOLUTION", value: "4.2 hrs" },
          { label: "OPEN TICKETS", value: "3" },
          { label: "RESOLVED THIS WEEK", value: "8" },
        ].map((s) => (
          <div key={s.label} className="bg-background-card border border-border rounded-[10px] p-4">
            <span className="text-label text-foreground-secondary tracking-[0.08em]">{s.label}</span>
            <div className="text-[20px] font-bold text-foreground tracking-tight mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {["all", "open", "in_progress", "resolved"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[11px] px-3 py-1.5 rounded-full capitalize transition-colors ${filter === f ? "bg-foreground text-background font-medium" : "bg-background-elevated text-foreground-secondary border border-border"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="bg-background-card border border-border rounded-[12px] overflow-hidden">
        <div className="grid grid-cols-[70px_1fr_1fr_80px_90px_90px_80px_40px] bg-background-elevated border-b border-border">
          {["ID", "Client", "Subject", "Priority", "Status", "Assigned", "Updated", ""].map((h) => (
            <div key={h} className="px-4 py-2.5 text-[10px] font-medium text-foreground-secondary uppercase tracking-[0.08em]">{h}</div>
          ))}
        </div>
        {filtered.map((t) => (
          <div key={t.id} className="grid grid-cols-[70px_1fr_1fr_80px_90px_90px_80px_40px] border-b border-border/50 hover:bg-[#111114] transition-colors cursor-pointer">
            <div className="px-4 py-3 text-[11px] text-foreground-secondary font-mono">{t.id}</div>
            <div className="px-4 py-3 text-[12px] text-foreground">{t.client}</div>
            <div className="px-4 py-3 text-[12px] text-foreground-secondary truncate">{t.subject}</div>
            <div className="px-4 py-3"><span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${priorityColors[t.priority]}`}>{t.priority}</span></div>
            <div className="px-4 py-3"><span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border capitalize ${statusColors[t.status]}`}>{t.status.replace("_", " ")}</span></div>
            <div className="px-4 py-3 text-[11px] text-foreground-secondary">{t.assignedTo}</div>
            <div className="px-4 py-3 text-[10px] text-foreground-muted">{t.updated}</div>
            <div className="px-4 py-3"><button className="p-1 rounded hover:bg-background-elevated"><MoreHorizontal className="w-3.5 h-3.5 text-foreground-secondary" /></button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
