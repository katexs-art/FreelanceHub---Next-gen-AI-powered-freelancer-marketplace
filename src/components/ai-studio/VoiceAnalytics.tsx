import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVapiData } from "@/services/vapiSync";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(142,70%,55%)", "hsl(0,0%,60%)", "hsl(36,90%,55%)", "hsl(0,70%,55%)", "hsl(220,70%,55%)"];

export function VoiceAnalytics() {
  const { user } = useAuth();
  const vapiData = useVapiData(user?.id);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vapiData.getCalls(200).then(data => { setCalls(data); setLoading(false); });
  }, [user?.id]);

  // Call volume by day (last 30 days)
  const volumeData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().split("T")[0]] = 0;
    }
    calls.forEach(c => {
      if (c.started_at) {
        const day = new Date(c.started_at).toISOString().split("T")[0];
        if (days[day] !== undefined) days[day]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calls: count,
    }));
  }, [calls]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    calls.forEach(c => { const s = c.status || "unknown"; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [calls]);

  // Duration distribution
  const durationData = useMemo(() => {
    const buckets = { "< 30s": 0, "30s-1m": 0, "1-3m": 0, "3-5m": 0, "5m+": 0 };
    calls.forEach(c => {
      const d = c.duration_seconds || 0;
      if (d < 30) buckets["< 30s"]++;
      else if (d < 60) buckets["30s-1m"]++;
      else if (d < 180) buckets["1-3m"]++;
      else if (d < 300) buckets["3-5m"]++;
      else buckets["5m+"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [calls]);

  // Daily cost
  const costData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().split("T")[0]] = 0;
    }
    calls.forEach(c => {
      if (c.started_at && c.cost) {
        const day = new Date(c.started_at).toISOString().split("T")[0];
        if (days[day] !== undefined) days[day] += Number(c.cost);
      }
    });
    return Object.entries(days).map(([date, cost]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost: Number(cost.toFixed(2)),
    }));
  }, [calls]);

  const totalCost = calls.reduce((s, c) => s + (Number(c.cost) || 0), 0);

  if (loading) return <div className="text-center py-12 text-foreground-secondary">Loading analytics...</div>;

  if (calls.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-foreground-secondary text-[14px]">No call data yet</p>
        <p className="text-foreground-secondary text-[12px]">Connect Vapi in Integrations to start seeing analytics.</p>
      </div>
    );
  }

  const tooltipStyle = { contentStyle: { background: "hsl(240,6%,9%)", border: "1px solid hsl(240,4%,16%)", borderRadius: 8, fontSize: 12, color: "#c8c7c2" } };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Calls", value: calls.length },
          { label: "Completed", value: calls.filter(c => c.status === "ended" || c.status === "completed").length },
          { label: "Total Cost", value: `$${totalCost.toFixed(2)}` },
          { label: "Avg Duration", value: `${Math.round(calls.reduce((s, c) => s + (c.duration_seconds || 0), 0) / calls.length)}s` },
        ].map(s => (
          <div key={s.label} className="bg-background-card border border-border rounded-[10px] p-4">
            <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em]">{s.label}</p>
            <p className="text-[24px] font-bold text-foreground tracking-[-0.03em] mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Call Volume */}
        <div className="bg-background-card border border-border rounded-[12px] p-5">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Call Volume (30 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={volumeData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#7a7975" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#7a7975" }} tickLine={false} axisLine={false} width={30} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="calls" stroke="#f8f7f4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Call Outcomes */}
        <div className="bg-background-card border border-border rounded-[12px] p-5">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Call Outcomes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {statusData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] text-foreground-secondary">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Distribution */}
        <div className="bg-background-card border border-border rounded-[12px] p-5">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Call Duration</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={durationData}>
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#7a7975" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#7a7975" }} tickLine={false} axisLine={false} width={30} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill="#f8f7f4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Over Time */}
        <div className="bg-background-card border border-border rounded-[12px] p-5">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Cost Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={costData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#7a7975" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#7a7975" }} tickLine={false} axisLine={false} width={40} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="cost" stroke="hsl(142,70%,55%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
