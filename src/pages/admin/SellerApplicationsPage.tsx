import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ApplicationRow {
  id: string;
  seller_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  language: string;
  skills: string[];
  primary_category: string;
  secondary_category: string | null;
  experience_description: string;
  packages: any;
  portfolio_urls: string[];
  created_at: string;
}

export default function SellerApplicationsPage() {
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seller_applications" as any)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setApps((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (app: ApplicationRow) => {
    setBusyId(app.id);
    const { error } = await supabase.rpc("approve_seller", { _seller: app.seller_id });
    setBusyId(null);
    if (error) return toast.error(error.message);

    // Best-effort email (non-blocking)
    try {
      await supabase.functions.invoke("send-marketplace-email", {
        body: {
          template: "seller_approved",
          to_user_id: app.seller_id,
          subject: "You are approved to sell on Katexs",
          body: "Congratulations — you are approved to sell on Katexs. Start building your profile and getting matched to buyers today.",
        },
      });
    } catch { /* ignore */ }

    toast.success("Seller approved");
    load();
  };

  const reject = async (app: ApplicationRow) => {
    if (!reason.trim()) return toast.error("Please enter a reason");
    setBusyId(app.id);
    const { error } = await supabase.rpc("reject_seller", { _seller: app.seller_id, _reason: reason });
    setBusyId(null);
    if (error) return toast.error(error.message);

    try {
      await supabase.functions.invoke("send-marketplace-email", {
        body: {
          template: "seller_rejected",
          to_user_id: app.seller_id,
          subject: "Your Katexs seller application",
          body: `Your Katexs seller application was not approved. ${reason}`,
        },
      });
    } catch { /* ignore */ }

    toast.success("Application rejected");
    setRejectingId(null);
    setReason("");
    load();
  };

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Seller Applications</h1>
        <p className="text-sm text-foreground-muted mb-6">Pending applications, sorted oldest first.</p>

        {loading ? (
          <div className="text-sm text-foreground-muted">Loading…</div>
        ) : apps.length === 0 ? (
          <div className="text-sm text-foreground-muted">No applications pending review.</div>
        ) : (
          <div className="space-y-4">
            {apps.map((a) => (
              <div key={a.id} className="bg-background border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{a.full_name}</div>
                    <div className="text-xs text-foreground-muted mt-0.5">
                      {a.primary_category}{a.secondary_category ? ` · ${a.secondary_category}` : ""}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(a.skills ?? []).map((s) => (
                        <span key={s} className="text-xs px-2 py-1 rounded-full bg-background-elevated border border-border">{s}</span>
                      ))}
                    </div>
                    {a.experience_description && (
                      <p className="text-sm mt-3 whitespace-pre-wrap">{a.experience_description}</p>
                    )}
                    {a.portfolio_urls?.length > 0 && (
                      <div className="mt-3 grid grid-cols-6 gap-2">
                        {a.portfolio_urls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square block bg-background-elevated rounded-md overflow-hidden border border-border">
                            {url.match(/\.pdf$/i)
                              ? <div className="flex items-center justify-center h-full text-xs text-foreground-muted">PDF</div>
                              : <img src={url} alt="" className="w-full h-full object-cover" />}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" disabled={busyId === a.id} onClick={() => approve(a)} className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejectingId(rejectingId === a.id ? null : a.id); setReason(""); }} className="border-red-600 text-red-600 hover:bg-red-50">Reject</Button>
                  </div>
                </div>
                {rejectingId === a.id && (
                  <div className="mt-4 space-y-2">
                    <Textarea placeholder="Rejection reason (sent to applicant)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                    <Button size="sm" disabled={busyId === a.id} onClick={() => reject(a)} className="bg-red-600 hover:bg-red-700 text-white">Confirm Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
