import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Play, FileText, Download } from "lucide-react";
import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import { useAuth } from "@/hooks/useAuth";
import { useVapiData } from "@/services/vapiSync";

export function VoiceCallHistory() {
  const { user } = useAuth();
  const vapiData = useVapiData(user?.id);
  const [calls, setCalls] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transcriptModal, setTranscriptModal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vapiData.getCalls(100).then(data => { setCalls(data); setLoading(false); });
  }, [user?.id]);

  const filtered = calls.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.caller_number?.includes(search)) return false;
    return true;
  });

  const totalCost = calls.reduce((sum, c) => sum + (Number(c.cost) || 0), 0);
  const avgDuration = calls.length ? Math.round(calls.reduce((s, c) => s + (c.duration_seconds || 0), 0) / calls.length) : 0;
  const completedCount = calls.filter(c => c.status === "ended" || c.status === "completed").length;

  const statusColor = (s: string) => {
    if (s === "ended" || s === "completed") return "green";
    if (s === "failed") return "destructive";
    return "default";
  };

  const formatDuration = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Calls", value: calls.length },
          { label: "Avg Duration", value: formatDuration(avgDuration) },
          { label: "Total Cost", value: `$${totalCost.toFixed(2)}` },
          { label: "Completed", value: completedCount },
        ].map(s => (
          <div key={s.label} className="bg-background-card border border-border rounded-[10px] p-4">
            <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em]">{s.label}</p>
            <p className="text-[24px] font-bold text-foreground tracking-[-0.03em] mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-secondary" />
          <Input className="pl-9 h-9 text-[13px]" placeholder="Search by phone number..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["all", "ended", "no-answer", "failed"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[11px] rounded-md transition-colors ${statusFilter === s ? "bg-background-elevated text-foreground" : "text-foreground-secondary hover:text-foreground"}`}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-background-card border border-border rounded-[12px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-background-elevated border-b border-border">
                {["Time", "From", "Duration", "Status", "Reason", "Recording", "Transcript", "Cost"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-foreground-secondary">Loading call history...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-foreground-secondary">
                  {calls.length === 0 ? "No calls synced yet. Connect Vapi in Integrations to import your call history." : "No calls match your filters."}
                </td></tr>
              ) : filtered.map(call => (
                <tr key={call.id} className="border-b border-border hover:bg-background-elevated">
                  <td className="px-4 py-2.5 text-foreground-secondary whitespace-nowrap">
                    {call.started_at ? new Date(call.started_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-foreground font-mono text-[11px]">{call.caller_number || "—"}</td>
                  <td className="px-4 py-2.5 text-foreground">{formatDuration(call.duration_seconds)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusColor(call.status || "")} className="text-[9px]">{call.status || "unknown"}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-foreground-secondary text-[11px]">{call.ended_reason || "—"}</td>
                  <td className="px-4 py-2.5">
                    {call.recording_url ? (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" asChild>
                        <a href={call.recording_url} target="_blank" rel="noopener"><Play className="w-3 h-3 mr-1" />Play</a>
                      </Button>
                    ) : <span className="text-foreground-secondary">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {call.transcript ? (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setTranscriptModal(call)}>
                        <FileText className="w-3 h-3 mr-1" />View
                      </Button>
                    ) : <span className="text-foreground-secondary">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-foreground-secondary">{call.cost != null ? `$${Number(call.cost).toFixed(2)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Modal */}
      <Modal open={!!transcriptModal} onOpenChange={() => setTranscriptModal(null)}>
        <ModalContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <ModalTitle className="text-[16px] font-semibold text-foreground">
            Call Transcript — {transcriptModal?.caller_number || "Unknown"}
          </ModalTitle>
          <div className="mt-4 space-y-2">
            {transcriptModal?.transcript ? (
              <div className="bg-[hsl(240,12%,3%)] border border-border rounded-lg p-4 text-[12px] text-foreground-secondary font-mono whitespace-pre-wrap leading-relaxed">
                {transcriptModal.transcript}
              </div>
            ) : (
              <p className="text-foreground-secondary text-[13px]">No transcript available.</p>
            )}
            {transcriptModal?.summary && (
              <div className="bg-[hsl(var(--accent-purple)/0.06)] border border-[hsl(var(--accent-purple)/0.15)] rounded-lg p-3">
                <p className="text-[10px] text-[#AFA9EC] uppercase tracking-[0.1em] mb-1">River Summary</p>
                <p className="text-[12px] text-foreground-secondary">{transcriptModal.summary}</p>
              </div>
            )}
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
