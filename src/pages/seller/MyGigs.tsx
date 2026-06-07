import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PromoteGigDialog } from "@/components/marketplace/PromoteGigDialog";

interface Gig {
  id: string;
  title: string;
  status: "draft" | "pending_review" | "active" | "paused" | "denied";
  starting_price: number;
  total_orders: number;
  average_rating: number;
  impressions: number;
  thumbnail_url: string | null;
}

const STATUS_STYLE: Record<Gig["status"], string> = {
  draft: "bg-background-elevated text-foreground-muted",
  pending_review: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  paused: "bg-foreground-subtle/10 text-foreground-muted",
  denied: "bg-destructive/10 text-destructive",
};

export default function MyGigs() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("gigs").select("*").eq("seller_id", user.id).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setGigs((data ?? []) as Gig[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const togglePause = async (g: Gig) => {
    const next = g.status === "active" ? "paused" : g.status === "paused" ? "active" : g.status;
    if (next === g.status) return;
    const { error } = await supabase.from("gigs").update({ status: next }).eq("id", g.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <>
      <SiteHeader showCategories={false} />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My services</h1>
            <p className="text-foreground-muted mt-1">Manage and publish the services you offer.</p>
          </div>
          <Link to="/seller/gigs/new"><Button><Plus className="h-4 w-4" /> New Service</Button></Link>
        </div>

        {loading ? (
          <p className="text-foreground-muted text-sm">Loading…</p>
        ) : gigs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-10 text-center">
            <h3 className="font-semibold">No services yet</h3>
            <p className="text-sm text-foreground-muted mt-1 mb-5">Create your first one to get discovered.</p>
            <Link to="/seller/gigs/new"><Button>Create a service</Button></Link>
          </div>
        ) : (
          <div className="bg-background border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background-subtle text-foreground-muted text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-medium">Service</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Impressions</th>
                  <th className="py-3 px-4 font-medium text-right">Projects</th>
                  <th className="py-3 px-4 font-medium text-right">From</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gigs.map((g) => (
                  <tr key={g.id} className="hover:bg-background-subtle">
                    <td className="py-3 px-4">
                      <Link to={`/seller/gigs/${g.id}/edit`} className="flex items-center gap-3 hover:text-primary">
                        <div className="w-12 h-9 rounded bg-background-elevated overflow-hidden shrink-0">
                          {g.thumbnail_url && <img src={g.thumbnail_url} className="w-full h-full object-cover" alt="" />}
                        </div>
                        <span className="font-medium line-clamp-1">{g.title || "Untitled service"}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLE[g.status])}>
                        {g.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{g.impressions}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{g.total_orders}</td>
                    <td className="py-3 px-4 text-right tabular-nums">${g.starting_price ?? 0}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center gap-3 justify-end">
                        {g.status === "active" && <PromoteGigDialog gigId={g.id} onPromoted={load} />}
                        {(g.status === "active" || g.status === "paused") && (
                          <button onClick={() => togglePause(g)} className="text-xs text-primary hover:underline">
                            {g.status === "active" ? "Pause" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      <SiteFooter />
    </>
  );
}
