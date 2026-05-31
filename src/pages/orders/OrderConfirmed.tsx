import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  status: string;
  project_title: string | null;
  delivery_deadline: string | null;
  gig_id: string | null;
  created_at: string;
  order_number?: string | null;
}

interface SellerProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

function formatLongDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const CARD: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #EBEBEB",
  borderRadius: 16,
  padding: 24,
};

export default function OrderConfirmed() {
  const { order_id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [trackOpen, setTrackOpen] = useState(true);
  const [nowIso] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav(`/login?redirect=/orders/${order_id}/confirmed`);
      return;
    }
    if (!order_id) return;
    (async () => {
      setLoading(true);
      const { data: o, error } = await supabase
        .from("orders")
        .select(
          "id, buyer_id, seller_id, price, status, project_title, delivery_deadline, gig_id, created_at, order_number",
        )
        .eq("id", order_id)
        .maybeSingle();
      if (error || !o) {
        setErr("Project not found");
        setLoading(false);
        return;
      }
      if (o.buyer_id !== user.id) {
        nav(`/orders/${o.id}`, { replace: true });
        return;
      }
      setOrder(o as OrderRow);
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", o.seller_id)
        .maybeSingle();
      setSeller(p as SellerProfile | null);
      setLoading(false);
    })();
  }, [authLoading, user, order_id, nav]);

  const messageSeller = async () => {
    if (!order) return;
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      _other: order.seller_id,
      _gig_id: order.gig_id,
      _order_id: order.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    nav(`/inbox/${data}`);
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container-page py-10 text-sm text-foreground-muted">
          Loading…
        </main>
        <SiteFooter />
      </div>
    );

  if (err || !order)
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container-page py-10 text-sm">
          {err ?? "Project not found"}
        </main>
        <SiteFooter />
      </div>
    );

  const sellerName = seller?.full_name || seller?.username || "Expert";
  const firstName = sellerName.split(" ")[0];
  const sellerAvatar = seller?.avatar_url || "/placeholder.svg";
  const deliveryText = formatLongDate(order.delivery_deadline);
  const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;

  const events = [
    { icon: "📋", title: "You placed the project", ts: order.created_at },
    { icon: "✅", title: "Payment confirmed", ts: nowIso },
    { icon: "🔔", title: "Expert has been notified", ts: nowIso },
  ];

  const trackSteps = [
    { label: "Project placed", done: true, ts: order.created_at },
    { label: "Expert working", done: false },
    { label: "Delivery submitted", done: false },
    { label: "You review delivery", done: false },
    { label: "Project completed", done: false },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      <SiteHeader />
      <main
        className="flex-1"
        style={{ maxWidth: 960, margin: "0 auto", width: "100%", padding: "48px 24px" }}
      >
        <div className="confirmed-grid">
          <style>{`
            .confirmed-grid {
              display: grid;
              grid-template-columns: 65% 35%;
              gap: 32px;
              align-items: start;
            }
            @media (max-width: 900px) {
              .confirmed-grid { grid-template-columns: 1fr; }
              .confirmed-right { position: static !important; }
            }
          `}</style>

          {/* LEFT COLUMN */}
          <div>
            {/* Success banner */}
            <div
              style={{
                background: "#FFFFFF",
                borderLeft: "4px solid #16A34A",
                borderRadius: "0 12px 12px 0",
                padding: 24,
                marginBottom: 24,
              }}
            >
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0A0A0A", marginBottom: 8 }}>
                Your project is now in the works
              </h1>
              <p style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
                We notified {sellerName} about your project. You should receive your delivery by{" "}
                {deliveryText}.
              </p>
            </div>

            {/* Activity timeline */}
            <div style={CARD}>
              <div
                style={{
                  fontSize: 12,
                  color: "#AAAAAA",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 16,
                }}
              >
                Today
              </div>
              <div>
                {events.map((ev, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      padding: "12px 0",
                      borderBottom:
                        i < events.length - 1 ? "1px solid #F5F5F5" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#F0F0F0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {ev.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A" }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#AAAAAA", marginTop: 2 }}>
                        {formatTime(ev.ts)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <aside className="confirmed-right" style={{ position: "sticky", top: 24 }}>
            {/* Expert card */}
            <div style={{ ...CARD, marginBottom: 16 }}>
              <img
                src={sellerAvatar}
                alt={sellerName}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "2px solid #EBEBEB",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#0A0A0A",
                  marginTop: 12,
                }}
              >
                {sellerName}
              </div>
              {seller?.username && (
                <div style={{ fontSize: 13, color: "#AAAAAA" }}>@{seller.username}</div>
              )}
              <div style={{ fontSize: 12, color: "#AAAAAA", marginBottom: 16 }}>
                Active recently
              </div>
              <button
                type="button"
                onClick={messageSeller}
                onMouseOver={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#333")
                }
                onMouseOut={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#0A0A0A")
                }
                style={{
                  width: "100%",
                  background: "#0A0A0A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 12,
                  height: 48,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                Message {firstName}
              </button>
            </div>

            {/* Order details */}
            <div style={CARD}>
              <DetailRow
                label="Ordered from"
                value={<span style={{ fontWeight: 500, color: "#0A0A0A" }}>{sellerName}</span>}
              />
              <DetailRow
                label="Delivery date"
                value={
                  <span style={{ fontWeight: 500, color: "#0A0A0A" }}>{deliveryText}</span>
                }
              />
              <DetailRow
                label="Total price"
                value={
                  <span style={{ fontWeight: 700, color: "#0A0A0A" }}>${order.price}</span>
                }
              />
              <DetailRow
                label="Order number"
                value={
                  <span
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      color: "#0A0A0A",
                    }}
                  >
                    {orderNum}
                  </span>
                }
              />

              {/* Track Project collapsible */}
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #EBEBEB" }}>
                <button
                  type="button"
                  onClick={() => setTrackOpen((v) => !v)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0A0A0A",
                  }}
                >
                  <span>Track Project</span>
                  {trackOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {trackOpen && (
                  <div style={{ marginTop: 16 }}>
                    {trackSteps.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          position: "relative",
                          paddingBottom: i < trackSteps.length - 1 ? 14 : 0,
                        }}
                      >
                        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: s.done ? "#16A34A" : "transparent",
                              border: s.done ? "none" : "2px solid #D4D4D4",
                              flexShrink: 0,
                            }}
                          />
                          {i < trackSteps.length - 1 && (
                            <div
                              style={{
                                width: 2,
                                flex: 1,
                                background: "#EBEBEB",
                                marginTop: 2,
                                minHeight: 16,
                              }}
                            />
                          )}
                        </div>
                        <div style={{ paddingBottom: 4 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: s.done ? "#0A0A0A" : "#888",
                            }}
                          >
                            {s.label}
                          </div>
                          {s.done && s.ts && (
                            <div style={{ fontSize: 11, color: "#AAAAAA", marginTop: 2 }}>
                              {formatTime(s.ts)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Escrow info */}
              <div
                style={{
                  background: "#F7F7F7",
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 16,
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <ShieldCheck size={14} color="#666" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>
                  Your payment of ${order.price} is held securely in escrow. Released after you
                  approve delivery.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        fontSize: 14,
        color: "#555",
        gap: 12,
      }}
    >
      <span>{label}</span>
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}
