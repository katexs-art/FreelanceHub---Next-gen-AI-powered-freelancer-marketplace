import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, MoreHorizontal, UserCog, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const mockTeam = [
  { id: "1", email: "admin@katexs.com", name: "System Admin", role: "admin", lastLogin: "2 min ago", active: true },
  { id: "2", email: "support@katexs.com", name: "Support Team", role: "support", lastLogin: "1 hr ago", active: true },
  { id: "3", email: "sales@katexs.com", name: "Sales Lead", role: "sales", lastLogin: "3 hr ago", active: true },
];

const roleColors: Record<string, string> = {
  admin: "bg-[#f09595]/10 text-[#f09595] border-[#f09595]/20",
  support: "bg-accent-green/10 text-accent-green border-accent-green/20",
  sales: "bg-[#85B7EB]/10 text-[#85B7EB] border-[#85B7EB]/20",
};

export default function AdminTeam() {
  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Team Members</h1>
          <p className="text-[12px] text-foreground-secondary mt-0.5">{mockTeam.length} members</p>
        </div>
        <Button size="sm" className="h-8 text-[11px]">Add team member</Button>
      </div>

      {/* Roles info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { role: "Admin", desc: "Full access to everything", icon: Shield, color: "#f09595" },
          { role: "Support", desc: "Support tickets, client profiles, messenger", icon: UserCog, color: "#4ade80" },
          { role: "Sales", desc: "Client list, trials, affiliates", icon: UserCog, color: "#85B7EB" },
        ].map((r) => (
          <div key={r.role} className="bg-background-card border border-border rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-1">
              <r.icon className="w-3.5 h-3.5" style={{ color: r.color }} />
              <span className="text-[13px] font-semibold text-foreground">{r.role}</span>
            </div>
            <p className="text-[11px] text-foreground-secondary">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-background-card border border-border rounded-[12px] overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_100px_100px_50px] bg-background-elevated border-b border-border">
          {["Member", "Role", "Last login", "Status", ""].map((h) => (
            <div key={h} className="px-4 py-2.5 text-[10px] font-medium text-foreground-secondary uppercase tracking-[0.08em]">{h}</div>
          ))}
        </div>
        {mockTeam.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_120px_100px_100px_50px] border-b border-border/50 hover:bg-[#111114] transition-colors">
            <div className="px-4 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-background-elevated border border-border-subtle flex items-center justify-center text-[10px] font-medium text-foreground">
                {m.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[12px] font-medium text-foreground">{m.name}</div>
                <div className="text-[10px] text-foreground-secondary">{m.email}</div>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center">
              <span className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded-full border ${roleColors[m.role]}`}>{m.role}</span>
            </div>
            <div className="px-4 py-3 flex items-center">
              <span className="text-[11px] text-foreground-secondary">{m.lastLogin}</span>
            </div>
            <div className="px-4 py-3 flex items-center">
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full border bg-accent-green/10 text-accent-green border-accent-green/20">Active</span>
            </div>
            <div className="px-4 py-3 flex items-center">
              <button className="p-1 rounded hover:bg-background-elevated"><MoreHorizontal className="w-3.5 h-3.5 text-foreground-secondary" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
