import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, Package, CheckCircle2, Upload, RotateCw, MessageSquare } from "lucide-react";
import { LeaveReview } from "@/components/marketplace/LeaveReview";

interface Order {
  id: string; order_number: string; status: string; price: number;
  buyer_id: string; seller_id: string; gig_id: string; package_id: string | null;
  delivery_deadline: string | null; delivered_at: string | null;
  requirements_submitted: boolean; revision_count: number;
  gigs: { title: string; thumbnail_url: string | null } | null;
  gig_packages: { title: string | null; delivery_days: number; revisions: number } | null;
  buyer: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
  seller: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
}
interface Requirement { id: string; question: string; field_type: string; is_required: boolean; sort_order: number; }
interface Delivery { id: string; message: string | null; file_urls: string[]; created_at: string; is_revision: boolean; }

export default function OrderWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryMsg, setDeliveryMsg] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("orders").select(`
      id, order_number, status, price, buyer_id, seller_id, gig_id, package_id,
      delivery_deadline, delivered_at, requirements_submitted, revision_count,
      gigs:gig_id (title, thumbnail_url),
      gig_packages:package_id (title, delivery_days, revisions),
      buyer:buyer_id (full_name, username, avatar_url),
      seller:seller_id (full_name, username, avatar_url)
    `).eq("id", id).maybeSingle();
    setOrder(data as any);
    if (data) {
      const [{ data: r }, { data: d }] = await Promise.all([
        supabase.from("gig_requirements").select("*").eq("gig_id", (data as any).gig_id).order("sort_order"),
        supabase.from("order_deliveries").select("*").eq("order_id", (data as any).id).order("created_at", { ascending: false }),
      ]);
      setReqs((r as any) ?? []);
      setDeliveries((d as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <AppShell><div className="text-foreground-muted text-sm">Loading…</div></AppShell>;
  if (!order || !user) return <AppShell><div>Order not found.</div></AppShell>;

  const isBuyer = user.id === order.buyer_id;
  const isSeller = user.id === order.seller_id;
  const counterpart = isBuyer ? order.seller : order.buyer;

  const submitRequirements = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const rows = reqs
        .filter((r) => answers[r.id])
        .map((r) => ({ order_id: order.id, requirement_id: r.id, answer: answers[r.id] }));
      if (rows.length) await supabase.from("order_requirements_answers").insert(rows);
      const newDeadline = new Date(Date.now() + (order.gig_packages?.delivery_days ?? 7) * 86400000).toISOString();
      const { error } = await supabase.from("orders").update({
        requirements_submitted: true,
        requirements_submitted_at: new Date().toISOString(),
        status: "active",
        delivery_deadline: newDeadline,
      }).eq("id", order.id);
      if (error) throw error;
      toast.success("Requirements sent");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

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
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({
      status: "completed", completed_at: new Date().toISOString(),
    }).eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Order completed");
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
            <h1 className="text-lg font-semibold line-clamp-1">{order.gigs?.title}</h1>
            <div className="text-xs text-foreground-muted mt-0.5">
              with {counterpart?.full_name ?? counterpart?.username} · {order.gig_packages?.title ?? "Package"}
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

        <div className="mt-4">
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
        {!order.requirements_submitted && (
          <section className="mt-8 bg-background border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-1">Requirements</h2>
            <p className="text-sm text-foreground-muted mb-4">
              {isBuyer ? "Answer the seller's questions to start the order." : "Waiting for buyer to send requirements."}
            </p>
            {reqs.length === 0 && isBuyer && (
              <p className="text-sm text-foreground-muted italic">No questions — confirm to start.</p>
            )}
            <div className="space-y-4">
              {reqs.map((r) => (
                <div key={r.id}>
                  <label className="block text-sm font-medium mb-1.5">
                    {r.question} {r.is_required && <span className="text-destructive">*</span>}
                  </label>
                  {isBuyer ? (
                    <Textarea value={answers[r.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [r.id]: e.target.value }))} rows={3} />
                  ) : (
                    <div className="text-sm text-foreground-muted italic">—</div>
                  )}
                </div>
              ))}
            </div>
            {isBuyer && (
              <Button onClick={submitRequirements} disabled={busy} className="mt-5">Send requirements</Button>
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
              <Textarea placeholder="Message to the buyer" value={deliveryMsg} onChange={(e) => setDeliveryMsg(e.target.value)} rows={3} />
              <Input type="file" multiple onChange={(e) => setDeliveryFiles(Array.from(e.target.files ?? []))} />
              <Button onClick={deliver} disabled={busy || (!deliveryMsg && deliveryFiles.length === 0)}>
                <Upload className="h-4 w-4" /> Deliver
              </Button>
            </div>
          )}

          {isBuyer && order.status === "delivered" && (
            <div className="mt-6 border-t border-border pt-6 flex gap-3">
              <Button onClick={accept} disabled={busy}><CheckCircle2 className="h-4 w-4" /> Accept & complete</Button>
              {(order.revision_count ?? 0) < (order.gig_packages?.revisions ?? 0) && (
                <Button variant="outline" onClick={requestRevision} disabled={busy}>
                  <RotateCw className="h-4 w-4" /> Request revision
                </Button>
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
