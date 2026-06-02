import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, Package, CheckCircle2, Upload, RotateCw, MessageSquare, Wifi } from "lucide-react";
import { LeaveReview } from "@/components/marketplace/LeaveReview";
import { OrderResolutionActions } from "@/components/marketplace/OrderResolutionActions";
import { OrderTimeline, DeliveryCountdown } from "@/components/marketplace/OrderTimeline";
import { shouldEmail } from "@/lib/emailPrefs";

interface Party { id?: string; full_name: string | null; username: string | null; avatar_url: string | null; email?: string | null }
interface Order {
  id: string; order_number: string; status: string; price: number;
  buyer_id: string; seller_id: string; gig_id: string | null; package_id: string | null;
  delivery_deadline: string | null; delivered_at: string | null;
  requirements_submitted: boolean; requirements_submitted_at: string | null;
  revision_count: number; created_at: string; completed_at: string | null;
  dispute_deadline: string | null; escrow_status: string | null; project_title: string | null;
  gigs: { title: string; thumbnail_url: string | null } | null;
  gig_packages: { title: string | null; delivery_days: number; revisions: number } | null;
  buyer: Party | null;
  seller: Party | null;
}

interface Delivery { id: string; message: string | null; file_urls: string[]; created_at: string; is_revision: boolean; }

export default function OrderWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  // All hooks at top — never below an early return.
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryMsg, setDeliveryMsg] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data: o, error: oErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (oErr) throw oErr;
      if (!o) {
        setOrder(null);
        setLoading(false);
        return;
      }

      const [gigRes, pkgRes, profilesRes, delivRes] = await Promise.all([
        o.gig_id
          ? supabase.from("gigs").select("title, thumbnail_url").eq("id", o.gig_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        o.package_id
          ? supabase.from("gig_packages").select("title, delivery_days, revisions").eq("id", o.package_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        supabase.from("profiles").select("id, full_name, username, avatar_url, email").in("id", [o.buyer_id, o.seller_id]),
        supabase.from("order_deliveries").select("*").eq("order_id", o.id).order("created_at", { ascending: false }),
      ]);

      const profiles = (profilesRes.data as Party[] | null) ?? [];
      const buyer = profiles.find((p) => p.id === o.buyer_id) ?? null;
      const seller = profiles.find((p) => p.id === o.seller_id) ?? null;

      setOrder({
        ...(o as any),
        gigs: gigRes.data ?? null,
        gig_packages: pkgRes.data ?? null,
        buyer,
        seller,
      });
      setDeliveries((delivRes.data as any) ?? []);
    } catch (e: any) {
      console.error("OrderWorkspace load failed", e);
      setLoadError(e.message ?? "Failed to load order");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Realtime: refresh on any order or delivery change
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_deliveries", filter: `order_id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl">
          <div className="text-foreground-muted text-sm">Loading order…</div>
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="max-w-4xl">
          <div className="bg-background border border-border rounded-xl p-8 text-center">
            <h1 className="text-lg font-semibold mb-1">Unable to load order</h1>
            <p className="text-sm text-foreground-muted mb-4">{loadError}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={load}>Try again</Button>
              <Button variant="outline" asChild><Link to="/orders">Back to orders</Link></Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <div className="max-w-4xl">
          <div className="bg-background border border-border rounded-xl p-8 text-center">
            <h1 className="text-lg font-semibold mb-1">Order not found</h1>
            <p className="text-sm text-foreground-muted mb-4">
              This order doesn't exist or you don't have access to it.
            </p>
            <Button variant="outline" asChild><Link to="/orders">Back to orders</Link></Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return <AppShell><div>Please sign in to view this order.</div></AppShell>;
  }

  const isBuyer = user.id === order.buyer_id;
  const isSeller = user.id === order.seller_id;
  const counterpart = isBuyer ? order.seller : order.buyer;
  const orderTitle = order.gigs?.title ?? order.project_title ?? "Custom project";


  const deliver = async () => {
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of deliveryFiles) {
        const path = `${order.id}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("delivery-files").upload(path, f);
        if (error) throw error;
        urls.push(path);
      }
      const isRev = order.status === "revision_requested";
      const { error: dErr } = await supabase.from("order_deliveries").insert({
        order_id: order.id, delivered_by: user.id, message: deliveryMsg, file_urls: urls, is_revision: isRev,
      });
      if (dErr) throw dErr;
      const autoComplete = new Date(Date.now() + 3 * 86400000).toISOString();
      await supabase.from("orders").update({
        status: "delivered", delivered_at: new Date().toISOString(), auto_complete_at: autoComplete,
      }).eq("id", order.id);
      setDeliveryMsg(""); setDeliveryFiles([]);
      toast.success("Delivery sent");
      if (order.buyer?.email && shouldEmail("orders")) {
        supabase.functions.invoke("send-marketplace-email", {
          body: {
            template: "order_delivered", to: order.buyer.email,
            data: { order_id: order.id, order_number: order.order_number, gig_title: orderTitle, seller_name: order.seller?.full_name ?? order.seller?.username },
          },
        });
      }
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const accept = async () => {
    if (!order) return;
    setBusy(true);
    const { error } = await supabase.rpc("approve_delivery", { _order_id: order.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Delivery approved — funds released");
    if (order.seller?.email && shouldEmail("orders")) {
      supabase.functions.invoke("send-marketplace-email", {
        body: {
          template: "order_completed", to: order.seller.email,
          data: { order_id: order.id, order_number: order.order_number, is_seller: true, buyer_name: order.buyer?.full_name ?? order.buyer?.username },
        },
      });
    }
    load();
  };

  const raiseDispute = async () => {
    if (!order) return;
    if (!disputeReason.trim()) return toast.error("Please describe the issue");
    setBusy(true);
    const { error } = await supabase.rpc("raise_dispute", {
      _order_id: order.id, _reason: disputeReason.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Dispute opened — our team will review");
    setDisputeOpen(false); setDisputeReason("");
    load();
  };

  const requestRevision = async () => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({
      status: "revision_requested", revision_count: (order.revision_count ?? 0) + 1,
    }).eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Revision requested");
    load();
  };

  return (
    <AppShell>
      <div className="max-w-4xl">
        <button onClick={() => nav(-1)} className="text-xs text-foreground-muted hover:text-foreground mb-3">← Back</button>

        <div className="bg-background border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-background-elevated overflow-hidden shrink-0">
            {order.gigs?.thumbnail_url && <img src={order.gigs.thumbnail_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground-muted">{order.order_number}</div>
            <h1 className="text-lg font-semibold line-clamp-1">{orderTitle}</h1>
            <div className="text-xs text-foreground-muted mt-0.5">
              with {counterpart?.full_name ?? counterpart?.username ?? "—"} · {order.gig_packages?.title ?? "Package"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-foreground-muted">Total</div>
            <div className="text-xl font-bold">${order.price}</div>
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <Stat icon={Package} label="Status" value={order.status.replace(/_/g, " ")} />
          <Stat icon={Clock} label="Deadline" value={order.delivery_deadline ? new Date(order.delivery_deadline).toLocaleDateString() : "—"} />
          <Stat icon={RotateCw} label="Revisions" value={`${order.revision_count}/${order.gig_packages?.revisions ?? 0}`} />
        </div>

        <div className="mt-3"><DeliveryCountdown deadline={order.delivery_deadline} status={order.status} /></div>

        <div className="mt-4"><OrderTimeline order={order as any} /></div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={async () => {
            const other = isBuyer ? order.seller_id : order.buyer_id;
            const { data, error } = await supabase.rpc("get_or_create_conversation", {
              _other: other, _gig_id: order.gig_id, _order_id: order.id,
            });
            if (error) return toast.error(error.message);
            nav(`/inbox/${data}`);
          }}>
            <MessageSquare className="h-4 w-4" /> Message {isBuyer ? "seller" : "buyer"}
          </Button>
          {!["completed","cancelled","refunded"].includes(order.status) && (
            <OrderResolutionActions orderId={order.id} onChange={load} />
          )}
        </div>

        {order.status === "completed" && (
          <section className="mt-8 bg-background border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Review</h2>
            <LeaveReview
              orderId={order.id} gigId={order.gig_id}
              buyerId={order.buyer_id} sellerId={order.seller_id}
              currentUserId={user.id} onDone={load}
            />
          </section>
        )}

        {/* Requirements */}
        {order.gig_id && !order.requirements_submitted && (
          <section className="mt-8 bg-background border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-1">Requirements</h2>
            <p className="text-sm text-foreground-muted mb-4">
              {isBuyer
                ? "Send your requirements so the seller can start the project."
                : "Waiting for the buyer to send their requirements."}
            </p>
            {isBuyer && (
              <Button asChild>
                <Link to={`/orders/${order.id}/requirements`}>Send requirements</Link>
              </Button>
            )}
          </section>
        )}

        {/* Deliveries */}
        <section className="mt-8 bg-background border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Deliveries</h2>
          {deliveries.length === 0 ? (
            <p className="text-sm text-foreground-muted">No deliveries yet.</p>
          ) : (
            <div className="space-y-4">
              {deliveries.map((d) => (
                <div key={d.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span>{d.is_revision ? "Revision" : "Delivery"} · {new Date(d.created_at).toLocaleString()}</span>
                  </div>
                  {d.message && <p className="mt-2 text-sm whitespace-pre-line">{d.message}</p>}
                  {d.file_urls.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {d.file_urls.map((path) => (
                        <li key={path}>
                          <button className="text-primary hover:underline" onClick={async () => {
                            const { data } = await supabase.storage.from("delivery-files").createSignedUrl(path, 3600);
                            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                          }}>
                            {path.split("/").pop()}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {isSeller && (order.status === "active" || order.status === "revision_requested") && (
            <div className="mt-6 border-t border-border pt-6 space-y-3">
              <h3 className="text-sm font-semibold">Send a delivery</h3>
              <Textarea placeholder="Message to the partner" value={deliveryMsg} onChange={(e) => setDeliveryMsg(e.target.value)} rows={3} />
              <Input type="file" multiple onChange={(e) => setDeliveryFiles(Array.from(e.target.files ?? []))} />
              <Button onClick={deliver} disabled={busy || (!deliveryMsg && deliveryFiles.length === 0)}>
                <Upload className="h-4 w-4" /> Deliver
              </Button>
            </div>
          )}

          {isBuyer && order.status === "delivered" && (
            <div className="mt-6 border-t border-border pt-6 space-y-4">
              {order.dispute_deadline && (
                <div style={{
                  background: "#fff8e1", border: "1px solid #f1d77b",
                  borderRadius: 8, padding: 12, fontSize: 13, color: "#5a4a10",
                }}>
                  {(() => {
                    const ms = new Date(order.dispute_deadline).getTime() - Date.now();
                    const days = Math.max(0, Math.ceil(ms / 86400000));
                    const when = new Date(order.dispute_deadline).toLocaleString();
                    return `${days} day${days === 1 ? "" : "s"} remaining to review — approve or dispute by ${when}`;
                  })()}
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                <Button onClick={accept} disabled={busy}><CheckCircle2 className="h-4 w-4" /> Approve Delivery</Button>
                <Button variant="outline" onClick={() => setDisputeOpen((v) => !v)} disabled={busy}>
                  Raise a Dispute
                </Button>
                {order.gig_packages && (order.revision_count ?? 0) < (order.gig_packages?.revisions ?? 0) && (
                  <Button variant="outline" onClick={requestRevision} disabled={busy}>
                    <RotateCw className="h-4 w-4" /> Request revision
                  </Button>
                )}
              </div>
              {disputeOpen && (
                <div className="space-y-2 border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold">Open a dispute</h4>
                  <Textarea
                    placeholder="Tell us what went wrong"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button onClick={raiseDispute} disabled={busy}>Submit dispute</Button>
                    <Button variant="outline" onClick={() => setDisputeOpen(false)} disabled={busy}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-background border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs text-foreground-muted"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}
