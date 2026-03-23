import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MoreHorizontal, Download, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockAffiliates = [
  { id: "1", name: "Alex Turner", code: "alex1234", referrals: 12, monthlyEarnings: 1247, totalPaid: 4820, pending: 1247, status: "active" },
  { id: "2", name: "Jessica Huang", code: "jess5678", referrals: 8, monthlyEarnings: 842, totalPaid: 2940, pending: 842, status: "active" },
  { id: "3", name: "Ryan Cole", code: "ryan9012", referrals: 3, monthlyEarnings: 297, totalPaid: 594, pending: 297, status: "active" },
  { id: "4", name: "Maria Garcia", code: "mari3456", referrals: 1, monthlyEarnings: 50, totalPaid: 100, pending: 50, status: "active" },
  { id: "5", name: "David Chen", code: "davi7890", referrals: 0, monthlyEarnings: 0, totalPaid: 0, pending: 0, status: "inactive" },
];

export default function AdminAffiliatePayouts() {
  const totalPending = mockAffiliates.reduce((s, a) => s + a.pending, 0);

  return (
    <div className="space-y-5 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Affiliate Payouts</h1>
          <p className="text-[12px] text-foreground-secondary mt-0.5">{mockAffiliates.length} affiliates · ${totalPending.toLocaleString()} pending</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5"><Download className="w-3 h-3" />Export</Button>
          <Button size="sm" className="h-8 text-[11px] gap-1.5"><DollarSign className="w-3 h-3" />Process all payouts</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "TOTAL AFFILIATES", value: "5" },
          { label: "ACTIVE REFERRALS", value: "24" },
          { label: "MONTHLY PAYOUTS", value: "$2,436" },
          { label: "TOTAL PAID ALL TIME", value: "$8,454" },
        ].map((s) => (
          <div key={s.label} className="bg-background-card border border-border rounded-[10px] p-4">
            <span className="text-label text-foreground-secondary tracking-[0.08em]">{s.label}</span>
            <div className="text-[20px] font-bold text-foreground tracking-tight mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-background-card border border-border rounded-[12px] overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_80px_100px_100px_80px_80px_40px] bg-background-elevated border-b border-border">
          {["Affiliate", "Code", "Referrals", "Monthly", "Total paid", "Pending", "Status", ""].map((h) => (
            <div key={h} className="px-4 py-2.5 text-[10px] font-medium text-foreground-secondary uppercase tracking-[0.08em]">{h}</div>
          ))}
        </div>
        {mockAffiliates.map((a) => (
          <div key={a.id} className="grid grid-cols-[1fr_100px_80px_100px_100px_80px_80px_40px] border-b border-border/50 hover:bg-[#111114] transition-colors">
            <div className="px-4 py-3 text-[12px] font-medium text-foreground">{a.name}</div>
            <div className="px-4 py-3 text-[11px] text-foreground-secondary font-mono">{a.code}</div>
            <div className="px-4 py-3 text-[12px] text-foreground">{a.referrals}</div>
            <div className="px-4 py-3 text-[12px] font-semibold text-accent-green">${a.monthlyEarnings.toLocaleString()}</div>
            <div className="px-4 py-3 text-[12px] text-foreground-secondary">${a.totalPaid.toLocaleString()}</div>
            <div className="px-4 py-3 text-[12px] text-[#EF9F27] font-medium">${a.pending.toLocaleString()}</div>
            <div className="px-4 py-3">
              <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${
                a.status === "active" ? "bg-accent-green/10 text-accent-green border-accent-green/20" : "bg-background-elevated text-foreground-secondary border-border"
              }`}>{a.status}</span>
            </div>
            <div className="px-4 py-3">
              <button className="p-1 rounded hover:bg-background-elevated"><MoreHorizontal className="w-3.5 h-3.5 text-foreground-secondary" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
