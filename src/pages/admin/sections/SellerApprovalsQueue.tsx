import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Application {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string;
  primary_category: string | null;
  secondary_category: string | null;
  seller_skills: string[];
  portfolio_urls: string[];
  bio: string | null;
  location: string | null;
  pending_packages: any;
  application_submitted_at: string | null;
}

export function SellerApprovalsQueue() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, email, primary_category, secondary_category, seller_skills, portfolio_urls, bio, location, pending_packages, application_submitted_at")
      .eq("seller_status", "pending_approval")
      .order("application_submitted_at", { ascending: false });
    setApps((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_seller", { _seller: id });
    if (error) return toast.error(error.message);
    toast.success("Seller approved");
    load();
  };

  const reject = async (id: string) => {
    if (!reason.trim()) return toast.error("Please enter a reason");
    const { error } = await supabase.rpc("reject_seller", { _seller: id, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Application rejected");
    setRejectingId(null);
    setReason("");
    load();
  };

  if (loading) return <div className="p-6 text-sm text-foreground-muted">Loading…</div>;
  if (apps.length === 0) return <div className="p-6 text-sm text-foreground-muted">No applications pending review.</div>;

  return (
    <div className="mt-4 space-y-4">
      {apps.map((a) => (
        <div key={a.id} className="bg-background border border-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{a.full_name ?? a.username ?? a.email}</div>
              <div className="text-xs text-foreground-muted mt-0.5">
                {a.primary_category}{a.secondary_category ? ` · ${a.secondary_category}` : ""}
              </div>
              {a.bio && <p className="text-sm mt-2">{a.bio}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(a.seller_skills ?? []).map((s) => (
                  <span key={s} className="text-xs px-2 py-1 rounded-full bg-background-elevated border border-border">{s}</span>
                ))}
              </div>
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
              <Button size="sm" onClick={() => approve(a.id)} className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
              <Button size="sm" variant="outline" onClick={() => { setRejectingId(rejectingId === a.id ? null : a.id); setReason(""); }} className="border-red-600 text-red-600 hover:bg-red-50">Reject</Button>
            </div>
          </div>
          {rejectingId === a.id && (
            <div className="mt-4 space-y-2">
              <Textarea placeholder="Reason for rejection (sent to applicant)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              <Button size="sm" onClick={() => reject(a.id)} className="bg-red-600 hover:bg-red-700 text-white">Send rejection</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
