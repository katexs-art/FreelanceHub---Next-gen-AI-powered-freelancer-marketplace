import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, string> = {
  active: "bg-accent-green/10 text-accent-green border-accent-green/20",
  trial: "bg-[#EF9F27]/10 text-[#EF9F27] border-[#EF9F27]/20",
  past_due: "bg-[#f09595]/10 text-[#f09595] border-[#f09595]/20",
  churned: "bg-background-elevated text-foreground-secondary border-border",
};

const planColors: Record<string, string> = {
  starter: "bg-background-elevated text-foreground-secondary border-border",
  growth: "bg-foreground/10 text-foreground border-border-strong",
  enterprise: "bg-accent-purple/10 text-accent-purple border-accent-purple/20",
};

type ClientRow = {
  id: string; email: string; full_name: string | null; business_name: string | null;
  industry: string | null; plan: string; created_at: string; phone: string | null;
  trial_end_date: string | null;
};

export default function AdminClients() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filters = ["all", "trial", "active", "starter", "growth", "enterprise"];

  useEffect(() => {
    supabase.from("users").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setClients(data as unknown as ClientRow[]);
    });
  }, []);

  // Use mock data if no real clients
  const displayClients: ClientRow[] = clients.length > 0 ? clients : [
    { id: "1", email: "marcus@sunrisehvac.com", full_name: "Marcus Rivera", business_name: "Sunrise HVAC", industry: "HVAC", plan: "growth", created_at: "2025-12-15", phone: "+16025551234", trial_end_date: null },
    { id: "2", email: "sarah@rhodesrealty.com", full_name: "Sarah Rhodes", business_name: "Rhodes Realty", industry: "Real Estate", plan: "starter", created_at: "2026-01-08", phone: "+16025555678", trial_end_date: null },
    { id: "3", email: "tony@kimplumbing.com", full_name: "Tony Kim", business_name: "Kim Plumbing", industry: "Plumbing", plan: "starter", created_at: "2026-03-10", phone: "+16025559012", trial_end_date: "2026-03-24" },
    { id: "4", email: "amy@glowmedspa.com", full_name: "Amy Lee", business_name: "Glow Med Spa", industry: "Med Spa", plan: "growth", created_at: "2026-02-01", phone: "+16025553456", trial_end_date: null },
    { id: "5", email: "james@millerelectric.com", full_name: "James Miller", business_name: "Miller Electric", industry: "Electrical", plan: "starter", created_at: "2026-03-18", phone: "+16025557890", trial_end_date: "2026-04-01" },
    { id: "6", email: "mike@mjlandscaping.com", full_name: "Mike Johnson", business_name: "MJ Landscaping", industry: "Landscaping", plan: "enterprise", created_at: "2025-11-20", phone: "+16025552345", trial_end_date: null },
  ];

  const getStatus = (c: ClientRow) => {
    if (c.trial_end_date && new Date(c.trial_end_date) > new Date()) return "trial";
    return "active";
  };

  const getMRR = (plan: string) => plan === "growth" ? "$297" : plan === "enterprise" ? "Custom" : "$100";

  const filtered = displayClients.filter((c) => {
    if (filter !== "all") {
      if (["starter", "growth", "enterprise"].includes(filter) && c.plan !== filter) return false;
      if (filter === "trial" && getStatus(c) !== "trial") return false;
      if (filter === "active" && getStatus(c) !== "active") return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return (c.full_name?.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.business_name?.toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">All Clients</h1>
          <p className="text-[12px] text-foreground-secondary mt-0.5">{filtered.length} clients</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-secondary" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px] h-8 pl-8 text-[12px]" />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5">
            <Download className="w-3 h-3" />Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] px-3 py-1.5 rounded-full capitalize transition-colors ${
              filter === f ? "bg-foreground text-background font-medium" : "bg-background-elevated text-foreground-secondary border border-border"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-background-card border border-border rounded-[12px] overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_80px_70px_80px_100px_40px] bg-background-elevated border-b border-border">
          {["Name", "Business", "Plan", "Status", "MRR", "Joined", ""].map((h) => (
            <div key={h} className="px-4 py-2.5 text-[10px] font-medium text-foreground-secondary uppercase tracking-[0.08em]">{h}</div>
          ))}
        </div>
        {filtered.map((c, i) => {
          const status = getStatus(c);
          return (
            <div key={c.id} className={`grid grid-cols-[1fr_120px_80px_70px_80px_100px_40px] border-b border-border/50 hover:bg-[#111114] transition-colors ${i % 2 === 0 ? "" : "bg-background-secondary/30"}`}>
              <div className="px-4 py-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[10px] font-medium text-foreground flex-shrink-0">
                  {(c.full_name || c.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-foreground truncate">{c.full_name || c.email}</div>
                  <div className="text-[10px] text-foreground-secondary truncate">{c.email}</div>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span className="text-[11px] text-foreground-secondary truncate">{c.business_name || "—"}</span>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded-full border ${planColors[c.plan] || planColors.starter}`}>{c.plan}</span>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span className={`text-[9px] font-medium capitalize px-2 py-0.5 rounded-full border ${statusColors[status] || statusColors.active}`}>{status}</span>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span className="text-[12px] font-semibold text-accent-green">{getMRR(c.plan)}</span>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span className="text-[11px] text-foreground-secondary">{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
              <div className="px-4 py-3 flex items-center">
                <button className="p-1 rounded hover:bg-background-elevated"><MoreHorizontal className="w-3.5 h-3.5 text-foreground-secondary" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
