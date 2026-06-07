import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  average_rating?: number;
  total_reviews?: number;
  total_orders?: number;
  starting_price?: number | null;
};

type Bid = {
  id: string;
  seller_id: string;
  bid_amount: number;
  delivery_days: number;
  cover_message: string;
  status: string;
  created_at: string;
};

function riverScoreFor(p: Profile): number {
  const completion = (p.total_orders ?? 0) > 0 ? Math.min(100, 80 + Math.min(20, p.total_reviews ?? 0)) : 50;
  const completeness =
    (p.bio ? 25 : 0) + (p.avatar_url ? 25 : 0) + (p.starting_price ? 25 : 0) + 25;
  const river = ((p.average_rating ?? 0) / 5) * 40 + completion * 0.35 + completeness * 0.25;
  return Math.round(river * 10) / 10;
}

export default function ProjectBids() {
  const { project_id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!project_id) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("project_posts").select("*").eq("id", project_id).maybeSingle();
      setProject(p);
      const { data: bs } = await supabase
        .from("bids")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", { ascending: false });
      setBids((bs ?? []) as Bid[]);
      const sellerIds = [...new Set((bs ?? []).map((b: any) => b.seller_id))];
      if (sellerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,username,avatar_url,bio")
          .in("id", sellerIds);
        const { data: gigs } = await supabase
          .from("gigs")
          .select("seller_id,starting_price,average_rating,total_reviews,total_orders")
          .in("seller_id", sellerIds);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p: any) => {
          map[p.id] = { ...p, average_rating: 0, total_reviews: 0, total_orders: 0, starting_price: null };
        });
        (gigs ?? []).forEach((g: any) => {
          const s = map[g.seller_id]; if (!s) return;
          s.total_reviews = (s.total_reviews ?? 0) + (g.total_reviews || 0);
          s.total_orders = (s.total_orders ?? 0) + (g.total_orders || 0);
          s.average_rating = Math.max(s.average_rating ?? 0, Number(g.average_rating) || 0);
          if (g.starting_price && (s.starting_price == null || g.starting_price < s.starting_price)) {
            s.starting_price = g.starting_price;
          }
        });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [project_id]);

  const accept = async (bid: Bid) => {
    setActing(true);
    const { data, error } = await supabase.rpc("create_escrow_order", {
      _source: "bid", _source_id: bid.id,
    });
    setActing(false);
    if (error || !data) {
      toast({ title: "Could not accept proposal", description: error?.message, variant: "destructive" });
      return;
    }

    // Email to expert: hired notification (notification+message handled by DB trigger on bids)
    const expertProfile = profiles[bid.seller_id];
    const partnerProfile = user ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : null;
    if (expertProfile) {
      (async () => {
        try {
          const { data: expertEmailRow } = await supabase
            .from("profiles").select("email").eq("id", bid.seller_id).maybeSingle();
          if (!expertEmailRow?.email) return;
          await supabase.functions.invoke("send-marketplace-email", {
            body: {
              template: "order_placed",
              to: expertEmailRow.email,
              data: {
                is_seller: true,
                buyer_name: partnerProfile?.data?.full_name ?? "Your client",
                order_number: "",
                gig_title: project.title,
                price: bid.bid_amount,
                order_id: data,
              },
            },
          });
        } catch { /* best-effort */ }
      })();
    }

    nav(`/checkout/${data}`);
  };

  const message = async (sellerId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: sellerId });
    if (error || !data) {
      toast({ title: "Could not open chat", variant: "destructive" });
      return;
    }
    nav(`/inbox/${data}`);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10 text-sm text-foreground-muted">Loading…</main>
      <SiteFooter />
    </div>
  );

  if (!project || project.buyer_id !== user?.id) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container-page py-10 text-sm text-foreground-muted">Project not found.</main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-semibold mb-2">{project.title}</h1>
        <p className="text-sm text-foreground-muted mb-8">{bids.length} bid{bids.length === 1 ? "" : "s"} received</p>

        {bids.length === 0 ? (
          <div className="text-sm text-foreground-muted">No proposals yet.</div>
        ) : (
          <ul className="space-y-3">
            {bids.map((b) => {
              const p = profiles[b.seller_id];
              const score = p ? riverScoreFor(p) : 0;
              return (
                <li key={b.id} className="surface border border-white/10 rounded-lg p-5 flex items-start gap-4">
                  <img
                    src={p?.avatar_url || "/placeholder.svg"}
                    alt={p?.full_name || "Expert"}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-sm">{p?.full_name || p?.username || "Expert"}</div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border border-white/15">
                        River {score.toFixed(1)}/100
                      </span>
                      <span className="text-xs text-foreground-muted">
                        ${b.bid_amount} · {b.delivery_days} days
                      </span>
                      {b.status !== "pending" && (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">{b.status}</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground-muted mt-2 whitespace-pre-wrap">{b.cover_message}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => accept(b)}
                      disabled={acting || b.status !== "pending" || project.status !== "open"}
                      className="h-9 px-4 rounded-full bg-green-600 text-white text-[11px] font-mono uppercase tracking-[0.12em] disabled:opacity-50"
                    >
                      Accept Bid
                    </button>
                    <Button variant="outline" size="sm" onClick={() => message(b.seller_id)}>
                      Message Seller
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
