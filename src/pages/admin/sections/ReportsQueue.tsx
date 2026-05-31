import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ReportsQueue() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("reports")
      .select("id, target_type, target_id, reason, description, status, created_at, reporter:reporter_id(username, email)")
      .order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reports").update({
      status, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`); load();
  };

  const hideGig = async (gigId: string, reportId: string) => {
    const { error } = await supabase.from("gigs").update({ status: "paused" }).eq("id", gigId);
    if (error) return toast.error(error.message);
    updateStatus(reportId, "actioned");
  };

  const suspendUser = async (userId: string, reportId: string) => {
    const { error } = await supabase.rpc("suspend_seller", { _seller: userId });
    if (error) return toast.error(error.message);
    updateStatus(reportId, "actioned");
  };

  return (
    <div className="mt-4 bg-background border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-background-elevated text-xs text-foreground-muted">
          <tr>
            <th className="text-left p-3 font-medium">Target</th>
            <th className="text-left p-3 font-medium">Reason</th>
            <th className="text-left p-3 font-medium">Reporter</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-foreground-muted">No reports.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border align-top">
              <td className="p-3">
                <div className="text-xs uppercase tracking-wide text-foreground-muted">{r.target_type}</div>
                <div className="font-mono text-xs">{r.target_id.slice(0, 8)}</div>
              </td>
              <td className="p-3 max-w-md">
                <div className="font-medium">{r.reason}</div>
                {r.description && <div className="text-xs text-foreground-muted mt-0.5">{r.description}</div>}
              </td>
              <td className="p-3 text-foreground-muted text-xs">{r.reporter?.username ?? r.reporter?.email}</td>
              <td className="p-3 capitalize">{r.status}</td>
              <td className="p-3 flex flex-wrap gap-1.5">
                {r.status === "open" && (
                  <>
                    {r.target_type === "gig" && (
                      <Button size="sm" onClick={() => hideGig(r.target_id, r.id)}>Hide play</Button>
                    )}
                    {r.target_type === "user" && (
                      <Button size="sm" onClick={() => suspendUser(r.target_id, r.id)}>Suspend user</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "dismissed")}>Dismiss</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
