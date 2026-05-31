import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function VerificationsQueue() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("seller_verifications")
      .select("id, seller_id, status, submitted_at, id_document_url, selfie_url, rejection_reason, expert:seller_id(full_name, username, email)")
      .order("submitted_at", { ascending: false, nullsFirst: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openDoc = async (path: string) => {
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const decide = async (id: string, approve: boolean) => {
    const reason = approve ? null : prompt("Rejection reason?") ?? "Insufficient documentation";
    const patch: any = {
      status: approve ? "verified" : "rejected",
      reviewed_at: new Date().toISOString(),
      rejection_reason: approve ? null : reason,
    };
    const { error } = await supabase.from("seller_verifications").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Expert verified" : "Verification rejected");
    load();
  };

  return (
    <div className="mt-4 bg-background border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-background-elevated text-xs text-foreground-muted">
          <tr>
            <th className="text-left p-3 font-medium">Expert</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Submitted</th>
            <th className="text-left p-3 font-medium">Documents</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-foreground-muted">No verification requests.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-3">{r.seller?.full_name ?? r.seller?.username ?? r.seller?.email}</td>
              <td className="p-3 capitalize">{r.status}</td>
              <td className="p-3 text-foreground-muted">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</td>
              <td className="p-3 flex gap-2">
                {r.id_document_url && <button onClick={() => openDoc(r.id_document_url)} className="text-primary hover:underline text-xs">ID</button>}
                {r.selfie_url && <button onClick={() => openDoc(r.selfie_url)} className="text-primary hover:underline text-xs">Selfie</button>}
              </td>
              <td className="p-3 flex gap-1.5">
                {r.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => decide(r.id, true)}>Approve</Button>
                    <Button size="sm" variant="ghost" onClick={() => decide(r.id, false)}>Reject</Button>
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
