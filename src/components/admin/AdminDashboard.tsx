import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, TrendingUp, TrendingDown, Users, CreditCard, UserPlus, Clock, Coins, Bot, Zap, MessageSquare, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const dateRanges = ["Today", "7 days", "30 days", "90 days"];

function MetricCard({ label, value, delta, deltaType, icon: Icon }: {
  label: string; value: string; delta?: string; deltaType?: "positive" | "negative" | "neutral";
  icon?: any;
}) {
  return (
    <div className="bg-background-card border border-border rounded-[10px] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-label text-foreground-secondary tracking-[0.08em]">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-foreground-muted" />}
      </div>
      <div className="text-[24px] font-bold text-foreground tracking-tight leading-none">{value}</div>
      {delta && (
        <div className={`text-[11px] mt-1.5 flex items-center gap-1 ${
          deltaType === "positive" ? "text-accent-green" : deltaType === "negative" ? "text-[#f09595]" : "text-foreground-secondary"
        }`}>
          {deltaType === "positive" ? <TrendingUp className="w-3 h-3" /> : deltaType === "negative" ? <TrendingDown className="w-3 h-3" /> : null}
          {delta}
        </div>
      )}
    </div>
  );
}

const mockMRRData = [
  { month: "Apr", mrr: 2400 }, { month: "May", mrr: 3100 }, { month: "Jun", mrr: 4200 },
  { month: "Jul", mrr: 5800 }, { month: "Aug", mrr: 7200 }, { month: "Sep", mrr: 8900 },
  { month: "Oct", mrr: 10400 }, { month: "Nov", mrr: 12100 }, { month: "Dec", mrr: 14600 },
  { month: "Jan", mrr: 16800 }, { month: "Feb", mrr: 19200 }, { month: "Mar", mrr: 22400 },
];

const mockActivity = [
  { type: "signup", text: "New signup: Marcus Rivera (Sunrise HVAC)", time: "2 min ago", color: "#4ade80" },
  { type: "payment", text: "Payment received: $297 from Kim's Med Spa (Growth)", time: "8 min ago", color: "#4ade80" },
  { type: "trial", text: "Trial started: Tony Kim (Starter plan)", time: "15 min ago", color: "#EF9F27" },
  { type: "upgrade", text: "Plan upgrade: Sarah Rhodes (Starter → Growth)", time: "22 min ago", color: "#4ade80" },
  { type: "churn", text: "Cancellation: James Miller (Starter — 'too expensive')", time: "1 hr ago", color: "#f09595" },
  { type: "workflow", text: "Workflow triggered: Missed call text-back × 14 clients", time: "1 hr ago", color: "#7F77DD" },
  { type: "integration", text: "Integration connected: Vapi by Amy Lee", time: "2 hr ago", color: "#85B7EB" },
  { type: "support", text: "Support ticket opened: Mike Johnson (billing issue)", time: "3 hr ago", color: "#EF9F27" },
  { type: "signup", text: "New signup: David Park (Park Landscaping)", time: "3 hr ago", color: "#4ade80" },
  { type: "payment", text: "Payment failed: Jordan Wells (card expired)", time: "4 hr ago", color: "#f09595" },
];

export default function AdminDashboard() {
  const [range, setRange] = useState("30 days");
  const [clientCount, setClientCount] = useState(0);
  const [affiliateCount, setAffiliateCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const [usersRes, affRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("affiliates").select("id", { count: "exact", head: true }),
      ]);
      setClientCount(usersRes.count || 0);
      setAffiliateCount(affRes.count || 0);
    };
    fetchCounts();
  }, []);

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Admin Dashboard</h1>
          <p className="text-[12px] text-foreground-secondary mt-0.5">Updated just now</p>
        </div>
        <div className="flex items-center gap-2">
          {dateRanges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[11px] px-3 py-1.5 rounded-full transition-colors ${
                range === r
                  ? "bg-foreground text-background font-medium"
                  : "bg-background-elevated text-foreground-secondary border border-border hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
          <button className="p-1.5 rounded-md hover:bg-background-elevated transition-colors ml-1">
            <RefreshCw className="w-3.5 h-3.5 text-foreground-secondary" />
          </button>
        </div>
      </div>

      {/* Key Metrics Row 1 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <MetricCard label="MRR" value="$22,400" delta="+16.7% vs last month" deltaType="positive" icon={DollarSignIcon} />
        <MetricCard label="TOTAL CLIENTS" value={String(clientCount || 47)} delta="+8 this month" deltaType="positive" icon={Users} />
        <MetricCard label="ACTIVE TRIALS" value="12" delta="Avg 9 days left" deltaType="neutral" icon={Clock} />
        <MetricCard label="CHURN RATE" value="3.2%" delta="-0.8% vs last month" deltaType="positive" icon={TrendingDown} />
        <MetricCard label="NEW SIGNUPS TODAY" value="4" delta="+2 vs yesterday" deltaType="positive" icon={UserPlus} />
        <MetricCard label="AFFILIATE PAYOUTS" value="$1,847" delta="Pending" deltaType="neutral" icon={Coins} />
      </div>

      {/* Key Metrics Row 2 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <MetricCard label="TOTAL REVENUE" value="$142,800" delta="All time" deltaType="neutral" />
        <MetricCard label="ARPU" value="$476" delta="+$22 vs last month" deltaType="positive" />
        <MetricCard label="TRIAL → PAID" value="34%" delta="+4% this month" deltaType="positive" />
        <MetricCard label="NET REVENUE" value="$138,200" delta="After refunds" deltaType="neutral" />
        <MetricCard label="ACTIVE AFFILIATES" value={String(affiliateCount || 6)} delta="All time" deltaType="neutral" />
        <MetricCard label="AFFILIATE PAID" value="$8,420" delta="All time" deltaType="neutral" />
      </div>

      {/* River Platform Stats */}
      <div className="rounded-[10px] p-5" style={{ background: "rgba(127,119,221,0.06)", border: "1px solid rgba(127,119,221,0.15)", borderTop: "2px solid #7F77DD" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent-purple" />
          <span className="text-[13px] font-semibold" style={{ color: "#AFA9EC" }}>River Platform Stats</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "API calls today", value: "2,847" },
            { label: "Avg response time", value: "1.2s" },
            { label: "Workflows run", value: "142" },
            { label: "Leads recovered", value: "23" },
            { label: "API cost today", value: "$4.82" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[20px] font-bold text-foreground tracking-tight">{s.value}</div>
              <div className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* MRR Chart */}
        <div className="lg:col-span-3 bg-background-card border border-border rounded-[10px] p-5">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">MRR Growth</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockMRRData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "#7a7975", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7a7975", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#161619", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#7a7975" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "MRR"]}
                />
                <Line type="monotone" dataKey="mrr" stroke="#f8f7f4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity */}
        <div className="lg:col-span-2 bg-background-card border border-border rounded-[10px] p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-[14px] font-semibold text-foreground">Live activity</h3>
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          </div>
          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {mockActivity.map((a, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color }} />
                <div className="min-w-0">
                  <p className="text-[12px] text-foreground-secondary leading-relaxed">{a.text}</p>
                  <span className="text-[10px] text-foreground-muted">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DollarSignIcon(props: any) {
  return <CreditCard {...props} />;
}
