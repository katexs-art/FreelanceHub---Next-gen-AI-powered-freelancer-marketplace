import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
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
  stripe_payment_intent_id: string | null;
}

interface SellerProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  average_rating?: number;
  total_reviews?: number;
  total_orders?: number;
  starting_price?: number | null;
}

function riverScore(p: SellerProfile): number {
  const completion = (p.total_orders ?? 0) > 0 ? Math.min(100, 80 + Math.min(20, p.total_reviews ?? 0)) : 50;
  const completeness = (p.bio ? 25 : 0) + (p.avatar_url ? 25 : 0) + (p.starting_price ? 25 : 0) + 25;
  const r = ((p.average_rating ?? 0) / 5) * 40 + completion * 0.35 + completeness * 0.25;
  return Math.round(r * 10) / 10;
}

function PayForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setErrorMsg(null);
    setBusy(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setErrorMsg(error.message ?? "Payment failed");
      setBusy(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      setSucceeded(true);
      setBusy(false);
      setTimeout(() => nav(`/orders/${orderId}`), 2000);
      return;
    }
    setErrorMsg("Payment did not complete. Please try again.");
    setBusy(false);
  };

  const bg = succeeded ? "#16a34a" : "#000";
  const label = succeeded ? "✓ Payment successful" : busy ? "Processing…" : "Pay & Start Project";

  return (
    <>
      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 16 }}>
        <PaymentElement />
      </div>
      {errorMsg && (
        <div role="alert" style={{
          marginTop: 12, padding: "10px 12px", borderRadius: 8,
          background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13,
        }}>{errorMsg}</div>
      )}
      {succeeded && (
        <div role="status" style={{
          marginTop: 12, padding: "10px 12px", borderRadius: 8,
          background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontSize: 13,
        }}>Payment successful — your project has started. Redirecting…</div>
      )}
      <button
        type="button"
        onClick={onPay}
        disabled={!stripe || busy || succeeded}
        style={{
          width: "100%", marginTop: 20,
          background: bg, color: "#fff", border: "none",
          borderRadius: 999, height: 52, fontSize: 16, fontWeight: 700,
          cursor: busy ? "wait" : succeeded ? "default" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {label}
      </button>
    </>
  );
}

export default function Checkout() {
  const { order_id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<StripeJs | null> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav(`/login?redirect=/checkout/${order_id}`); return; }
    if (!order_id) return;
    (async () => {
      setLoading(true);
      const { data: o, error } = await supabase
        .from("orders")
        .select("id, buyer_id, seller_id, price, status, project_title, delivery_deadline, stripe_payment_intent_id")
        .eq("id", order_id)
        .maybeSingle();
      if (error || !o) { setErr("Project not found"); setLoading(false); return; }
      if (o.buyer_id !== user.id) { setErr("This project belongs to another partner."); setLoading(false); return; }
      setOrder(o as OrderRow);

      // Seller profile + river score data
      const { data: p } = await supabase.from("profiles")
        .select("id,full_name,username,avatar_url,bio").eq("id", o.seller_id).maybeSingle();
      const { data: gigs } = await supabase.from("gigs")
        .select("starting_price,average_rating,total_reviews,total_orders").eq("seller_id", o.seller_id);
      const agg: SellerProfile = {
        ...(p as any), average_rating: 0, total_reviews: 0, total_orders: 0, starting_price: null,
      };
      (gigs ?? []).forEach((g: any) => {
        agg.total_reviews! += g.total_reviews || 0;
        agg.total_orders! += g.total_orders || 0;
        agg.average_rating = Math.max(agg.average_rating ?? 0, Number(g.average_rating) || 0);
        if (g.starting_price && (agg.starting_price == null || g.starting_price < agg.starting_price)) {
          agg.starting_price = g.starting_price;
        }
      });
      setSeller(agg);

      if (o.status !== "pending_payment") {
        // Already paid (or beyond) — bounce to workspace.
        nav(`/orders/${o.id}`, { replace: true });
        return;
      }

      // Mint a PaymentIntent
      const { data: pi, error: piErr } = await supabase.functions.invoke("stripe-payment-intent", {
        body: { order_id: o.id },
      });
      if (piErr || !pi?.client_secret) {
        setErr(piErr?.message || pi?.error || "Could not initialize payment");
        setLoading(false);
        return;
      }
      setClientSecret(pi.client_secret);
      setStripePromise(loadStripe(pi.publishable_key));
      setLoading(false);
    })();
  }, [authLoading, user, order_id, nav]);

  const partnerFee = useMemo(() => order ? Math.round(order.price * 0.05) : 0, [order]);
  const total = useMemo(() => order ? order.price + partnerFee : 0, [order, partnerFee]);

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10 text-sm text-foreground-muted">Loading…</main>
      <SiteFooter />
    </div>
  );

  if (err || !order) return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10 text-sm">{err ?? "Project not found"}</main>
      <SiteFooter />
    </div>
  );

  const score = seller ? riverScore(seller) : 0;
  const deadline = order.delivery_deadline ? new Date(order.delivery_deadline) : null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      <main className="flex-1" style={{ maxWidth: 720, margin: "0 auto", width: "100%", padding: "32px 16px" }}>
        {/* Order summary */}
        <div style={{
          background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <img
              src={seller?.avatar_url || "/placeholder.svg"}
              alt={seller?.full_name || "Expert"}
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>
                {seller?.full_name || seller?.username || "Expert"}
              </div>
              <div style={{
                display: "inline-block", marginTop: 4,
                fontSize: 11, fontFamily: "ui-monospace, monospace",
                textTransform: "uppercase", letterSpacing: "0.08em",
                padding: "2px 8px", borderRadius: 999, border: "1px solid #ddd", color: "#444",
              }}>
                River {score.toFixed(1)}/100
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
              {order.project_title || "Project"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111", lineHeight: 1 }}>
              ${order.price}
            </div>
            {deadline && (
              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                Delivery by {deadline.toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 12 }}>
            Secure Payment
          </h2>
          <div style={{
            background: "#f5f5f5", borderRadius: 8, padding: 12,
            fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.5,
          }}>
            Your payment is held securely in escrow. The seller only gets paid after you approve the delivery or 3 days pass with no dispute.
          </div>

          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
              <PayForm orderId={order.id} />
            </Elements>
          ) : (
            <div style={{ fontSize: 13, color: "#666" }}>Loading payment form…</div>
          )}

          <div style={{ marginTop: 20, fontSize: 14, color: "#111" }}>
            <Row label="Project price" value={`$${order.price}`} />
            <Row label="Service fee (5%)" value={`$${partnerFee}`} />
            <div style={{ height: 1, background: "#eee", margin: "10px 0" }} />
            <Row label="Total" value={`$${total}`} bold />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: bold ? "#111" : "#666" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
