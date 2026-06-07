import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Clock, CheckCircle2, Upload, RotateCw, MessageSquare,
  X, Paperclip, CircleDot, Package, Send, AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { LeaveReview } from "@/components/marketplace/LeaveReview";
import { OrderResolutionActions } from "@/components/marketplace/OrderResolutionActions";
import { shouldEmail } from "@/lib/emailPrefs";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Party {
  id?: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email?: string | null;
}
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
interface Delivery {
  id: string; message: string | null; file_urls: string[];
  created_at: string; is_revision: boolean;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  active:             { label: "In Progress",        bg: "#1e3a5f", color: "#60a5fa" },
  delivered:          { label: "Delivered",           bg: "#3a2e0a", color: "#fbbf24" },
  revision_requested: { label: "Revision Requested",  bg: "#3a1a0a", color: "#fb923c" },
  completed:          { label: "Complete",            bg: "#052e16", color: "#4ade80" },
  cancelled:          { label: "Cancelled",           bg: "#2d0a0a", color: "#f87171" },
  refunded:           { label: "Refunded",            bg: "#2d0a0a", color: "#f87171" },
  pending:            { label: "Pending",             bg: "#1a1a1a", color: "#888" },
  pending_requirements: { label: "Awaiting Requirements", bg: "#1a1a1a", color: "#888" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status.replace(/_/g, " "), bg: "#1a1a1a", color: "#888" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
      background: s.bg, color: s.color, textTransform: "uppercase", letterSpacing: "0.05em",
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 32 }: { src: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#1a1a1a", color: "#888", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, overflow: "hidden",
    }}>
      {src && !broken
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setBroken(true)} />
        : (name[0]?.toUpperCase() ?? "?")}
    </div>
  );
}

// ── Deliver Now modal ─────────────────────────────────────────────────────────

function DeliverModal({
  orderId, isRevision, onClose, onDone,
}: { orderId: string; isRevision: boolean; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        const path = `${orderId}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("delivery-files").upload(path, f);
        if (error) throw error;
        urls.push(path);
      }
      const { error: dErr } = await supabase.from("order_deliveries").insert({
        order_id: orderId, delivered_by: user.id,
        message: msg || null, file_urls: urls, is_revision: isRevision,
      });
      if (dErr) throw dErr;
      const autoComplete = new Date(Date.now() + 3 * 86400000).toISOString();
      const { error: uErr } = await supabase.from("orders").update({
        status: "delivered", delivered_at: new Date().toISOString(), auto_complete_at: autoComplete,
      }).eq("id", orderId);
      if (uErr) throw uErr;
      toast.success("Delivery sent!");
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Could not send delivery");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#111111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, zIndex: 1, margin: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
            {isRevision ? "Submit Revision" : "Deliver Now"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={20} /></button>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: "1.5px dashed #2a2a2a", borderRadius: 10, padding: "28px 20px",
            textAlign: "center", cursor: "pointer", marginBottom: 16,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#16A34A"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a"; }}
        >
          <Upload size={24} color="#888" style={{ margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            {files.length > 0 ? files.map((f) => f.name).join(", ") : "Click to upload delivery files"}
          </p>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        </div>

        {/* Message */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Delivery message</label>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={4}
            placeholder="Describe what you've delivered..."
            style={{
              width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
              borderRadius: 8, color: "#fff", fontSize: 13, padding: "10px 12px",
              outline: "none", resize: "vertical", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={submit}
            disabled={busy || (!msg.trim() && files.length === 0)}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 8,
              background: busy || (!msg.trim() && files.length === 0) ? "#1a3a1a" : "#16A34A",
              color: "#fff", fontWeight: 700, fontSize: 14, border: "none",
              cursor: busy || (!msg.trim() && files.length === 0) ? "default" : "pointer",
            }}
          >
            {busy ? "Sending…" : "Submit Delivery"}
          </button>
          <button onClick={onClose} style={{ padding: "11px 20px", borderRadius: 8, background: "transparent", border: "1px solid #2a2a2a", color: "#888", fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({
  order, deliveries, isBuyer, isSeller, busy,
  onAccept, onRequestRevision, onOpenDispute, onFileClick,
}: {
  order: Order; deliveries: Delivery[]; isBuyer: boolean; isSeller: boolean; busy: boolean;
  onAccept: () => void; onRequestRevision: () => void;
  onOpenDispute: () => void; onFileClick: (path: string) => void;
}) {
  type Item =
    | { kind: "event"; icon: any; label: string; at: string; accent?: boolean }
    | { kind: "delivery"; delivery: Delivery }
    | { kind: "status_change"; label: string; at: string; color: string };

  const items: Item[] = [];

  // Order placed
  items.push({ kind: "event", icon: CircleDot, label: "Order placed", at: order.created_at });

  // Requirements
  if (order.requirements_submitted_at) {
    items.push({ kind: "event", icon: Package, label: "Requirements submitted", at: order.requirements_submitted_at });
  }

  // Deliveries in chronological order
  const sorted = [...deliveries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  sorted.forEach((d) => {
    if (d.is_revision) {
      items.push({ kind: "status_change", label: "Revision requested", at: d.created_at, color: "#fb923c" });
    }
    items.push({ kind: "delivery", delivery: d });
  });

  // Completed
  if (order.completed_at) {
    items.push({ kind: "status_change", label: "Order marked complete", at: order.completed_at, color: "#4ade80" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        if (item.kind === "status_change") {
          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0", position: "relative" }}>
              {idx > 0 && <div style={{ position: "absolute", left: 19, top: 0, bottom: "50%", width: 1, background: "#1e1e1e" }} />}
              {!isLast && <div style={{ position: "absolute", left: 19, top: "50%", bottom: 0, width: 1, background: "#1e1e1e" }} />}
              <span style={{
                fontSize: 12, fontWeight: 600, color: item.color,
                background: "#0a0a0a", border: `1px solid ${item.color}33`,
                borderRadius: 999, padding: "3px 14px", zIndex: 1,
              }}>
                {item.label} · {new Date(item.at).toLocaleString()}
              </span>
            </div>
          );
        }

        if (item.kind === "event") {
          const Icon = item.icon;
          return (
            <div key={idx} style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={12} color="#888" />
                </div>
                {!isLast && <div style={{ width: 1, flex: 1, background: "#1e1e1e", minHeight: 16 }} />}
              </div>
              <div style={{ paddingBottom: 16, paddingTop: 4 }}>
                <div style={{ fontSize: 13, color: "#888" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{new Date(item.at).toLocaleString()}</div>
              </div>
            </div>
          );
        }

        if (item.kind === "delivery") {
          const d = item.delivery;
          const isRevCard = d.is_revision;
          const borderColor = isRevCard ? "#fb923c33" : "#16A34A33";
          const accentColor = isRevCard ? "#fb923c" : "#16A34A";

          return (
            <div key={d.id} style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: isRevCard ? "#3a1a0a" : "#052e16", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isRevCard ? <RotateCw size={12} color="#fb923c" /> : <Send size={12} color="#4ade80" />}
                </div>
                {!isLast && <div style={{ width: 1, flex: 1, background: "#1e1e1e", minHeight: 16 }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 16 }}>
                {/* Delivery card */}
                <div style={{
                  background: "#111111", border: `1px solid ${borderColor}`,
                  borderRadius: 10, padding: "14px 16px", marginBottom: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: d.message ? 10 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
                      {isRevCard ? "Revision submitted" : "Expert delivered the order"}
                    </span>
                    <span style={{ fontSize: 11, color: "#555" }}>{new Date(d.created_at).toLocaleString()}</span>
                  </div>

                  {d.message && (
                    <p style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: d.file_urls.length ? 12 : 0 }}>
                      {d.message}
                    </p>
                  )}

                  {d.file_urls.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {d.file_urls.map((url, fi) => (
                        <button
                          key={fi}
                          onClick={() => onFileClick(url)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "8px 12px", borderRadius: 8,
                            background: "#1a1a1a", border: "1px solid #2a2a2a",
                            color: "#60a5fa", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <Paperclip size={12} />
                          {url.split("/").pop() ?? url}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Buyer actions on the latest non-revision delivery */}
                  {isBuyer && order.status === "delivered" && idx === items.length - 1 && (
                    <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button
                        onClick={onAccept}
                        disabled={busy}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "9px 18px", borderRadius: 8,
                          background: "#052e16", border: "1px solid #16A34A",
                          color: "#4ade80", fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        <CheckCircle2 size={14} /> Accept Delivery
                      </button>
                      {order.gig_packages && (order.revision_count ?? 0) < (order.gig_packages.revisions ?? 0) && (
                        <button
                          onClick={onRequestRevision}
                          disabled={busy}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "9px 18px", borderRadius: 8,
                            background: "transparent", border: "1px solid #fb923c",
                            color: "#fb923c", fontSize: 13, fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          <RotateCw size={14} /> Request Revision
                        </button>
                      )}
                      <button
                        onClick={onOpenDispute}
                        disabled={busy}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "9px 18px", borderRadius: 8,
                          background: "transparent", border: "1px solid #2a2a2a",
                          color: "#888", fontSize: 13, cursor: "pointer",
                        }}
                      >
                        Raise Dispute
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// ── Timeline (right column) ───────────────────────────────────────────────────

function TimelinePanel({ order }: { order: Order }) {
  const steps = [
    { label: "Order Placed", at: order.created_at, done: true },
    { label: "Requirements Submitted", at: order.requirements_submitted_at, done: !!order.requirements_submitted_at },
    { label: "In Progress", at: order.requirements_submitted_at, done: ["active", "delivered", "revision_requested", "completed"].includes(order.status) },
    { label: "Delivered", at: order.delivered_at, done: !!order.delivered_at },
    { label: "Complete", at: order.completed_at, done: !!order.completed_at },
  ];

  return (
    <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Timeline</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: s.done ? "#052e16" : "#1a1a1a",
                border: `2px solid ${s.done ? "#16A34A" : "#2a2a2a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {s.done && <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 1, height: 28, background: s.done ? "#16A34A33" : "#1e1e1e" }} />
              )}
            </div>
            <div style={{ paddingBottom: i < steps.length - 1 ? 0 : 0, paddingTop: 2 }}>
              <div style={{ fontSize: 12, fontWeight: s.done ? 700 : 400, color: s.done ? "#ffffff" : "#555" }}>{s.label}</div>
              {s.at && s.done && (
                <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{new Date(s.at).toLocaleDateString()}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Due date countdown ────────────────────────────────────────────────────────

function DueDate({ deadline, status }: { deadline: string | null; status: string }) {
  if (!deadline || ["completed", "cancelled", "refunded"].includes(status)) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: overdue ? "#f87171" : "#888" }}>
      <Clock size={12} color={overdue ? "#f87171" : "#888"} />
      {overdue ? `Overdue by ${days}d ${hours}h` : `Due in ${days}d ${hours}h`}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OrderWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const prevStatus = useRef<string | null>(null);
  const prevDeliveryCount = useRef<number>(0);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data: o, error: oErr } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (oErr) throw oErr;
      if (!o) { setOrder(null); setLoading(false); return; }

      const [gigRes, pkgRes, profilesRes, delivRes] = await Promise.all([
        o.gig_id
          ? supabase.from("gigs").select("title, thumbnail_url").eq("id", o.gig_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        o.package_id
          ? supabase.from("gig_packages").select("title, delivery_days, revisions").eq("id", o.package_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase.from("profiles").select("id, full_name, username, avatar_url, email").in("id", [o.buyer_id, o.seller_id]),
        supabase.from("order_deliveries").select("*").eq("order_id", o.id).order("created_at", { ascending: false }),
      ]);

      const profiles = (profilesRes.data as Party[] | null) ?? [];
      const buyer = profiles.find((p) => p.id === o.buyer_id) ?? null;
      const seller = profiles.find((p) => p.id === o.seller_id) ?? null;
      const newOrder = { ...(o as any), gigs: gigRes.data ?? null, gig_packages: pkgRes.data ?? null, buyer, seller };
      const newDeliveries = (delivRes.data as any) ?? [];

      const statusChanged = prevStatus.current !== null && prevStatus.current !== newOrder.status;
      const newDeliveryArrived = prevDeliveryCount.current !== 0 && newDeliveries.length > prevDeliveryCount.current;
      if (statusChanged) toast.success(`Order updated: ${newOrder.status.replace(/_/g, " ")}`);
      else if (newDeliveryArrived) toast.success("New delivery received");

      prevStatus.current = newOrder.status;
      prevDeliveryCount.current = newDeliveries.length;
      setOrder(newOrder);
      setDeliveries(newDeliveries);
    } catch (e: any) {
      setLoadError(e.message ?? "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`order:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_deliveries", filter: `order_id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [id]);

  const accept = async () => {
    if (!order) return;
    setBusy(true);
    const { error } = await supabase.rpc("approve_delivery", { _order_id: order.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Delivery approved — funds released");
    if (order.seller?.email && shouldEmail("orders")) {
      supabase.functions.invoke("send-marketplace-email", {
        body: { template: "order_completed", to: order.seller.email,
          data: { order_id: order.id, order_number: order.order_number, is_seller: true, buyer_name: order.buyer?.full_name ?? order.buyer?.username } },
      });
    }
    load();
  };

  const raiseDispute = async () => {
    if (!order || !disputeReason.trim()) return toast.error("Please describe the issue");
    setBusy(true);
    const { error } = await supabase.rpc("raise_dispute", { _order_id: order.id, _reason: disputeReason.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Dispute opened — our team will review");
    setDisputeOpen(false); setDisputeReason(""); load();
  };

  const requestRevision = async () => {
    if (!order) return;
    setBusy(true);
    const { error } = await supabase.from("orders").update({
      status: "revision_requested", revision_count: (order.revision_count ?? 0) + 1,
    }).eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Revision requested");
    load();
  };

  const openInbox = async () => {
    if (!order || !user) return nav("/login");
    const other = user.id === order.buyer_id ? order.seller_id : order.buyer_id;
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      _other: other, _gig_id: order.gig_id, _order_id: order.id,
    });
    if (error) return toast.error(error.message);
    nav(`/inbox/${data}`);
  };

  // ── Loading / error / not found ──

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#888", fontSize: 14 }}>Loading order…</span>
        </div>
      </>
    );
  }

  if (loadError || !order) {
    return (
      <>
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 40, textAlign: "center", maxWidth: 400 }}>
            <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{loadError ? "Unable to load order" : "Order not found"}</h1>
            <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>{loadError ?? "This order doesn't exist or you don't have access."}</p>
            <Link to="/buyer/orders" style={{ color: "#16A34A", fontSize: 13 }}>← Back to orders</Link>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#888" }}>Please sign in to view this order.</span>
        </div>
      </>
    );
  }

  const isBuyer = user.id === order.buyer_id;
  const isSeller = user.id === order.seller_id;
  const counterpart = isBuyer ? order.seller : order.buyer;
  const orderTitle = order.gigs?.title ?? order.project_title ?? "Custom project";
  const orderNum = order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <SiteHeader />

      <div style={{ background: "#0a0a0a", minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>

          {/* Back */}
          <button
            onClick={() => nav(-1)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}
          >
            <ChevronLeft size={14} /> Back to orders
          </button>

          {/* Two-column layout */}
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>

            {/* LEFT COLUMN */}
            <div style={{ flex: "0 0 65%", minWidth: 0, maxWidth: "65%" }}>

              {/* Order header */}
              <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{orderNum}</div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", margin: "0 0 8px", lineHeight: 1.3 }}>
                      {orderTitle}
                    </h1>
                    <StatusBadge status={order.status} />
                  </div>
                  {isSeller && (order.status === "active" || order.status === "revision_requested") && (
                    <button
                      onClick={() => setDeliverModalOpen(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 20px", borderRadius: 10,
                        background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 14,
                        border: "none", cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      <Upload size={16} /> Deliver Now
                    </button>
                  )}
                </div>
              </div>

              {/* Requirements banner */}
              {order.gig_id && !order.requirements_submitted && (
                <div style={{
                  background: "#1e3a5f", border: "1px solid #1e4a8a", borderRadius: 10, padding: "14px 18px",
                  marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 3 }}>
                      {isBuyer ? "Requirements needed" : "Waiting for requirements"}
                    </div>
                    <div style={{ fontSize: 12, color: "#93c5fd" }}>
                      {isBuyer
                        ? "Send your requirements so the expert can start the project."
                        : "Waiting for the partner to send their requirements."}
                    </div>
                  </div>
                  {isBuyer && (
                    <Link
                      to={`/orders/${order.id}/requirements`}
                      style={{
                        padding: "8px 16px", borderRadius: 8, background: "#2563eb",
                        color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", flexShrink: 0,
                      }}
                    >
                      Send Requirements
                    </Link>
                  )}
                </div>
              )}

              {/* Auto-complete warning */}
              {isBuyer && order.status === "delivered" && order.dispute_deadline && (
                <div style={{
                  background: "#3a2e0a", border: "1px solid #78350f", borderRadius: 10, padding: "12px 16px",
                  marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#fbbf24",
                }}>
                  <AlertTriangle size={14} />
                  {(() => {
                    const ms = new Date(order.dispute_deadline).getTime() - Date.now();
                    const days = Math.max(0, Math.ceil(ms / 86400000));
                    return `${days} day${days === 1 ? "" : "s"} remaining to review — approve or dispute by ${new Date(order.dispute_deadline).toLocaleString()}`;
                  })()}
                </div>
              )}

              {/* Activity feed */}
              <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity</h2>
                <ActivityFeed
                  order={order}
                  deliveries={deliveries}
                  isBuyer={isBuyer}
                  isSeller={isSeller}
                  busy={busy}
                  onAccept={accept}
                  onRequestRevision={requestRevision}
                  onOpenDispute={() => setDisputeOpen(true)}
                  onFileClick={async (path) => {
                    const { data } = await supabase.storage.from("delivery-files").createSignedUrl(path, 3600);
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                  }}
                />
                {deliveries.length === 0 && order.status !== "completed" && (
                  <div style={{ fontSize: 13, color: "#555", paddingTop: 8 }}>
                    {isSeller ? "When you're ready, click \"Deliver Now\" to submit your work." : "Waiting for the expert to deliver."}
                  </div>
                )}
              </div>

              {/* Dispute form */}
              {disputeOpen && (
                <div style={{ background: "#111111", border: "1px solid #2a2a2a", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Open a Dispute</h3>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={4}
                    placeholder="Tell us what went wrong"
                    style={{
                      width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
                      borderRadius: 8, color: "#fff", fontSize: 13, padding: "10px 12px",
                      outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 12,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={raiseDispute} disabled={busy} style={{ padding: "9px 18px", borderRadius: 8, background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
                      Submit Dispute
                    </button>
                    <button onClick={() => setDisputeOpen(false)} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", border: "1px solid #2a2a2a", color: "#888", fontSize: 13, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Resolution actions */}
              {!["completed", "cancelled", "refunded"].includes(order.status) && (
                <div style={{ marginBottom: 16 }}>
                  <OrderResolutionActions orderId={order.id} onChange={load} />
                </div>
              )}

              {/* Leave review */}
              {order.status === "completed" && (
                <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>Leave a Review</h2>
                  <LeaveReview
                    orderId={order.id} gigId={order.gig_id}
                    buyerId={order.buyer_id} sellerId={order.seller_id}
                    currentUserId={user.id} onDone={load}
                  />
                </div>
              )}

            </div>

            {/* RIGHT COLUMN — sticky */}
            <div style={{ flex: "0 0 35%", maxWidth: "35%", position: "sticky", top: 128, alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Order summary card */}
              <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
                {/* Thumbnail */}
                {order.gigs?.thumbnail_url && (
                  <div style={{ aspectRatio: "16/9", background: "#1a1a1a" }}>
                    <img src={order.gigs.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 12, lineHeight: 1.4 }}>{orderTitle}</div>

                  {/* Counterpart */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Avatar src={counterpart?.avatar_url ?? null} name={counterpart?.full_name ?? counterpart?.username ?? "User"} size={28} />
                    <div>
                      <div style={{ fontSize: 11, color: "#555" }}>{isBuyer ? "Expert" : "Partner"}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#cccccc" }}>{counterpart?.full_name ?? counterpart?.username ?? "—"}</div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#888" }}>Status</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <DueDate deadline={order.delivery_deadline} status={order.status} />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#888" }}>Price paid</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>${order.price}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#888" }}>Revisions</span>
                      <span style={{ fontSize: 12, color: "#cccccc" }}>{order.revision_count} of {order.gig_packages?.revisions ?? 0} used</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <TimelinePanel order={order} />

              {/* Quick actions */}
              <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 18px" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Actions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={openInbox}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 14px", borderRadius: 8,
                      background: "#1a1a1a", border: "1px solid #2a2a2a",
                      color: "#cccccc", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%",
                    }}
                  >
                    <MessageSquare size={14} /> Message {isBuyer ? "Expert" : "Partner"}
                  </button>
                  {isBuyer && !["completed", "cancelled", "refunded"].includes(order.status) && (
                    <OrderResolutionActions orderId={order.id} onChange={load} />
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Deliver modal */}
      {deliverModalOpen && (
        <DeliverModal
          orderId={order.id}
          isRevision={order.status === "revision_requested"}
          onClose={() => setDeliverModalOpen(false)}
          onDone={load}
        />
      )}

      <SiteFooter />
    </>
  );
}
