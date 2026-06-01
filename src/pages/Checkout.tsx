import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { ShieldCheck } from "lucide-react";
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
  gig_id: string | null;
}

interface SellerProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface GigInfo {
  title: string | null;
  thumbnail_url: string | null;
}

function PayBlock({
  orderId,
  total,
  payMethod,
  onReadyChange,
}: {
  orderId: string;
  total: number;
  payMethod: "card" | "paypal";
  onReadyChange?: (ready: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setReady(false);
    setComplete(false);
    onReadyChange?.(false);
  }, [payMethod, onReadyChange]);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setErrorMsg(null);
    setBusy(true);
    try {
      const result = await Promise.race([
        stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/orders/${orderId}/confirmed`,
          },
          redirect: "if_required",
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("Payment failed - please try again")), 10000),
        ),
      ]);
      const { error, paymentIntent } = result as { error?: any; paymentIntent?: any };
      if (error) {
        setErrorMsg(error.message ?? "Payment failed");
        toast.error(error.message ?? "Payment failed");
        setBusy(false);
        return;
      }
      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")
      ) {
        setSucceeded(true);
        setBusy(false);
        setTimeout(() => nav(`/orders/${orderId}/confirmed`, { replace: true }), 600);
        return;
      }
      setErrorMsg("Payment did not complete. Please try again.");
      setBusy(false);
    } catch (e) {
      const msg = (e as Error).message || "Payment failed - please try again";
      setErrorMsg(msg);
      toast.error(msg);
      setBusy(false);
    }
  };

  const disabled = !stripe || !elements || busy || succeeded || !ready || !complete;
  const bg = succeeded ? "#15803D" : disabled && !busy ? "#9CA3AF" : "#16A34A";
  const label = succeeded
    ? "✓ Payment successful"
    : busy
    ? "Processing…"
    : `Pay Now — $${total}`;

  return (
    <>
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #EBEBEB",
          borderRadius: 12,
          padding: 16,
          minHeight: 220,
          marginBottom: 16,
          position: "relative",
        }}
      >
        {!ready && (
          <div
            aria-label="Loading payment form"
            style={{
              position: "absolute",
              inset: 16,
              borderRadius: 8,
              background:
                "linear-gradient(90deg,#f3f4f6 0%,#e5e7eb 50%,#f3f4f6 100%)",
              backgroundSize: "200% 100%",
              animation: "kxshimmer 1.2s infinite linear",
            }}
          >
            <style>{`@keyframes kxshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        )}
        <PaymentElement
          key={payMethod}
          onReady={() => {
            setReady(true);
            onReadyChange?.(true);
          }}
          onChange={(e) => setComplete(e.complete)}
          options={{
            layout: "tabs",
            paymentMethodOrder:
              payMethod === "paypal" ? ["paypal", "card"] : ["card", "paypal"],
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />
      </div>
      <button
        type="button"
        onClick={onPay}
        disabled={disabled}
        style={{
          width: "100%",
          marginTop: 4,
          background: bg,
          color: "#FFFFFF",
          border: "none",
          borderRadius: 12,
          height: 52,
          fontSize: 16,
          fontWeight: 600,
          cursor: busy ? "wait" : disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s",
          opacity: busy ? 0.85 : 1,
        }}
      >
        {label}
      </button>
      {errorMsg && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          {errorMsg}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 10,
          fontSize: 12,
          color: "#888",
        }}
      >
        <ShieldCheck size={14} /> Safe and secure payment
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "#AAAAAA",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        By clicking Pay Now you agree to Katexs Terms of Service and Payment Terms
      </div>
    </>
  );
}

export default function Checkout() {
  const { order_id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [gig, setGig] = useState<GigInfo | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<StripeJs | null> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPromo, setShowPromo] = useState(false);
  const [promo, setPromo] = useState("");
  const [payMethod, setPayMethod] = useState<"card" | "paypal">("card");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav(`/login?redirect=/checkout/${order_id}`);
      return;
    }
    if (!order_id) return;
    (async () => {
      setLoading(true);
      const { data: o, error } = await supabase
        .from("orders")
        .select(
          "id, buyer_id, seller_id, price, status, project_title, delivery_deadline, stripe_payment_intent_id, gig_id",
        )
        .eq("id", order_id)
        .maybeSingle();
      if (error || !o) {
        setErr("Project not found");
        setLoading(false);
        return;
      }
      if (o.buyer_id !== user.id) {
        setErr("This project belongs to another partner.");
        setLoading(false);
        return;
      }
      setOrder(o as OrderRow);

      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", o.seller_id)
        .maybeSingle();
      setSeller(p as SellerProfile | null);

      if (o.gig_id) {
        const { data: g } = await supabase
          .from("gigs")
          .select("title, thumbnail_url")
          .eq("id", o.gig_id)
          .maybeSingle();
        if (g) setGig(g as GigInfo);
      }

      if (o.status !== "pending_payment") {
        nav(`/orders/${o.id}`, { replace: true });
        return;
      }

      try {
        const invokePromise = supabase.functions.invoke("stripe-payment-intent", {
          body: { order_id: o.id },
        });
        const { data: pi, error: piErr } = (await Promise.race([
          invokePromise,
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error("Payment failed - please try again")), 10000),
          ),
        ])) as Awaited<typeof invokePromise>;
        if (piErr || !pi?.client_secret) {
          setErr(piErr?.message || pi?.error || "Could not initialize payment");
          setLoading(false);
          return;
        }
        setClientSecret(pi.client_secret);
        setStripePromise(loadStripe(pi.publishable_key));
      } catch (e) {
        setErr((e as Error).message || "Could not initialize payment");
        setLoading(false);
        return;
      }
      setClientSecret(pi.client_secret);
      setStripePromise(loadStripe(pi.publishable_key));
      setLoading(false);
    })();
  }, [authLoading, user, order_id, nav]);

  const partnerFee = useMemo(() => (order ? Math.round(order.price * 0.05) : 0), [order]);
  const total = useMemo(() => (order ? order.price + partnerFee : 0), [order, partnerFee]);

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
        <main className="flex-1 container-page py-10 text-sm">{err ?? "Project not found"}</main>
        <SiteFooter />
      </div>
    );

  const deadline = order.delivery_deadline ? new Date(order.delivery_deadline) : null;
  const itemTitle = gig?.title || order.project_title || "Project";
  const itemSubtitle = order.gig_id ? "Standard package" : "Custom project";
  const thumb = gig?.thumbnail_url || "/placeholder.svg";
  const sellerName = seller?.full_name || seller?.username || "Expert";
  const sellerAvatar = seller?.avatar_url || "/placeholder.svg";
  const amountLabel = order.gig_id ? "Selected package" : "Project amount";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      <SiteHeader />
      <main
        className="flex-1"
        style={{ maxWidth: 960, margin: "0 auto", width: "100%", padding: "48px 24px" }}
      >
        {clientSecret && stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#0A0A0A",
                  colorText: "#0A0A0A",
                  colorBackground: "#F7F7F7",
                  borderRadius: "8px",
                  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
                },
              },
            }}
          >
            <div className="checkout-grid">
              <style>{`
                .checkout-grid {
                  display: grid;
                  grid-template-columns: 65% 35%;
                  gap: 32px;
                  align-items: start;
                }
                @media (max-width: 900px) {
                  .checkout-grid { grid-template-columns: 1fr; }
                  .checkout-right { position: static !important; }
                }
              `}</style>

              {/* LEFT COLUMN */}
              <div>
                {/* Order summary card */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #EBEBEB",
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 20,
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                  }}
                >
                  <img
                    src={thumb}
                    alt={itemTitle}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      objectFit: "cover",
                      flexShrink: 0,
                      background: "#F7F7F7",
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#0A0A0A", lineHeight: 1.3 }}>
                      {itemTitle}
                    </div>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{itemSubtitle}</div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 10,
                        fontSize: 13,
                        color: "#555",
                      }}
                    >
                      <img
                        src={sellerAvatar}
                        alt={sellerName}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <span>{sellerName}</span>
                    </div>
                    {deadline && (
                      <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>
                        Delivery by {deadline.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment method card */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #EBEBEB",
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 20,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#0A0A0A",
                      marginBottom: 16,
                    }}
                  >
                    Payment method
                  </h2>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {([
                      { id: "card", label: "Credit / Debit card" },
                      { id: "paypal", label: "PayPal" },
                    ] as const).map((opt) => {
                      const active = payMethod === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPayMethod(opt.id)}
                          style={{
                            flex: 1,
                            height: 44,
                            borderRadius: 12,
                            border: `1px solid ${active ? "#0A0A0A" : "#EBEBEB"}`,
                            background: active ? "#0A0A0A" : "#FFFFFF",
                            color: active ? "#FFFFFF" : "#0A0A0A",
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    {payMethod === "card"
                      ? "Enter your card details on the right to complete payment securely."
                      : "Click Pay Now on the right to be redirected to PayPal."}
                  </div>
                </div>

                {/* Promo code row */}
                <div>
                  {!showPromo ? (
                    <button
                      type="button"
                      onClick={() => setShowPromo(true)}
                      onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#0A0A0A")}
                      onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#888")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        fontSize: 14,
                        color: "#888",
                        cursor: "pointer",
                      }}
                    >
                      + Apply promo code
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={promo}
                        onChange={(e) => setPromo(e.target.value)}
                        placeholder="Enter promo code"
                        style={{
                          flex: 1,
                          height: 44,
                          padding: "0 14px",
                          border: "1px solid #EBEBEB",
                          borderRadius: 12,
                          fontSize: 14,
                          background: "#FFFFFF",
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => toast.message("Promo codes coming soon")}
                        style={{
                          height: 44,
                          padding: "0 20px",
                          background: "#0A0A0A",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: 12,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <aside
                className="checkout-right"
                style={{ position: "sticky", top: 24 }}
              >
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #EBEBEB",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#0A0A0A",
                      marginBottom: 20,
                    }}
                  >
                    Order details
                  </h2>
                  <Row label={amountLabel} value={`$${order.price}`} />
                  <Row label="Katexs service fee (5%)" value={`$${partnerFee}`} />
                  <div style={{ height: 1, background: "#EBEBEB", margin: "14px 0" }} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#0A0A0A",
                      marginBottom: 20,
                    }}
                  >
                    <span>Total</span>
                    <span>${total}</span>
                  </div>

                  <PayBlock orderId={order.id} total={total} payMethod={payMethod} />
                </div>
              </aside>
            </div>
          </Elements>
        ) : (
          <div style={{ fontSize: 13, color: "#666" }}>Loading payment form…</div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        fontSize: 14,
      }}
    >
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ color: "#0A0A0A" }}>{value}</span>
    </div>
  );
}
