import { useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

const services = [
  { name: "Lovable Cloud", status: "operational", responseTime: "42ms", lastChecked: "Just now" },
  { name: "River AI (Anthropic)", status: "operational", responseTime: "1.2s", lastChecked: "Just now" },
  { name: "Twilio", status: "operational", responseTime: "180ms", lastChecked: "2 min ago" },
  { name: "Vapi", status: "operational", responseTime: "320ms", lastChecked: "2 min ago" },
  { name: "Stripe", status: "operational", responseTime: "210ms", lastChecked: "5 min ago" },
  { name: "SendGrid", status: "degraded", responseTime: "2.1s", lastChecked: "1 min ago" },
];

const recentErrors = [
  { time: "14:22:03", service: "SendGrid", error: "429 Too Many Requests — rate limit exceeded", severity: "warn" },
  { time: "13:45:18", service: "Vapi", error: "Timeout after 30s — call agent creation", severity: "error" },
  { time: "12:10:44", service: "River AI", error: "503 Service temporarily unavailable — retried successfully", severity: "warn" },
];

export default function AdminMonitor() {
  return (
    <div className="space-y-6 max-w-[1000px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Real-time Monitor</h1>
          <p className="text-[12px] text-foreground-secondary mt-0.5">Platform health & status</p>
        </div>
        <button className="flex items-center gap-1.5 text-[11px] text-foreground-secondary hover:text-foreground transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "ACTIVE USERS NOW", value: "14", color: "#4ade80" },
          { label: "WORKFLOWS RUNNING", value: "3", color: "#7F77DD" },
          { label: "API CALLS/MIN", value: "47", color: "#f8f7f4" },
          { label: "ERROR RATE", value: "0.3%", color: "#4ade80" },
        ].map((s) => (
          <div key={s.label} className="bg-background-card border border-border rounded-[10px] p-4">
            <span className="text-label text-foreground-secondary tracking-[0.08em]">{s.label}</span>
            <div className="text-[24px] font-bold tracking-tight mt-1" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Service Status */}
      <div className="bg-background-card border border-border rounded-[12px] overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-foreground">Service Status</h3>
        </div>
        {services.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-b-0">
            <div className="flex items-center gap-3">
              {s.status === "operational" ? (
                <Wifi className="w-4 h-4 text-accent-green" />
              ) : (
                <WifiOff className="w-4 h-4 text-[#EF9F27]" />
              )}
              <span className="text-[13px] text-foreground">{s.name}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[11px] text-foreground-secondary">{s.responseTime}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                s.status === "operational" ? "bg-accent-green/10 text-accent-green border-accent-green/20" : "bg-[#EF9F27]/10 text-[#EF9F27] border-[#EF9F27]/20"
              }`}>
                {s.status}
              </span>
              <span className="text-[10px] text-foreground-muted">{s.lastChecked}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Errors */}
      <div className="bg-background-card border border-border rounded-[12px] overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-foreground">Recent Errors</h3>
        </div>
        {recentErrors.map((e, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3 border-b border-border/50 last:border-b-0">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${e.severity === "error" ? "bg-[#f09595]" : "bg-[#EF9F27]"}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-foreground-muted font-mono">{e.time}</span>
                <span className="text-[11px] font-medium text-foreground">{e.service}</span>
              </div>
              <p className="text-[12px] text-foreground-secondary mt-0.5">{e.error}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
