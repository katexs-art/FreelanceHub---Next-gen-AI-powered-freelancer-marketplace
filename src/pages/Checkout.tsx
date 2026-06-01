import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  ShieldCheck,
  Check,
  Info,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCcw,
  Headphones,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const logCheckout = (step: string, payload?: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`[checkout] ${step}`, payload ?? "");
};

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

interface PayState {
  onPay: () => void;
  disabled: boolean;
  busy: boolean;
  succeeded: boolean;
  label: string;
}

function PayBlock({
  orderId,
  total,
  payMethod,
  onPayStateChange,
  onRetryInit,
  hideInternalButton,
}: {
  orderId: string;
  total: number;
  payMethod: "card" | "paypal";
  onPayStateChange?: (state: PayState) => void;
  onRetryInit?: () => void;
  hideInternalButton?: boolean;
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
  }, [payMethod]);

  const onPay = async () => {
    if (!stripe || !elements) {
      logCheckout("pay-click-aborted", { hasStripe: !!stripe, hasElements: !!elements });
      return;
    }
    logCheckout("pay-click", { orderId, total, payMethod, ts: new Date().toISOString() });
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
      logCheckout("confirmPayment-result", {
        errorType: error?.type,
        errorCode: error?.code,
        declineCode: error?.decline_code,
        errorMessage: error?.message,
        paymentIntentStatus: paymentIntent?.status,
        paymentIntentId: paymentIntent?.id,
      });
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
      logCheckout("confirmPayment-threw", { message: msg, error: e });
      setErrorMsg(msg);
      toast.error(msg);
      setBusy(false);
    }
  };

  const disabled = !stripe || !elements || busy || succeeded || !ready || !complete;
  const label = succeeded
    ? "✓ Payment successful"
    : busy
    ? "Processing…"
    : `Pay Now — $${total}`;

  useEffect(() => {
    onPayStateChange?.({ onPay, disabled, busy, succeeded, label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, busy, succeeded, label, stripe, elements]);

  const bg = succeeded ? "#15803D" : disabled && !busy ? "#9CA3AF" : "#16A34A";

  return (
    <>
      <div className="relative rounded-[12px] border border-border bg-white p-4 min-h-[220px]">
        {!ready && (
          <div
            aria-label="Loading payment form"
            className="absolute inset-4 rounded-lg"
            style={{
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
            logCheckout("payment-element-ready", { payMethod });
            setReady(true);
          }}
          onChange={(e) => {
            logCheckout("payment-element-change", { complete: e.complete, type: e.value?.type });
            setComplete(e.complete);
          }}
          options={{
            layout: "tabs",
            paymentMethodOrder:
              payMethod === "paypal" ? ["paypal", "card"] : ["card", "paypal"],
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />
      </div>

      {!hideInternalButton && (
        <button
          type="button"
          onClick={onPay}
          disabled={disabled}
          className="w-full mt-3 text-white font-semibold text-base rounded-[12px] h-[52px] transition-colors"
          style={{
            background: bg,
            cursor: busy ? "wait" : disabled ? "not-allowed" : "pointer",
            opacity: busy ? 0.85 : 1,
          }}
        >
          {label}
        </button>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="mt-3 px-3 py-2.5 rounded-lg border text-[13px]"
          style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}
        >
          <div className="mb-2">{errorMsg}</div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                onPay();
              }}
              disabled={busy || !stripe || !elements}
              className="h-8 px-3 bg-foreground text-background rounded-lg text-xs font-semibold"
              style={{ cursor: busy ? "wait" : "pointer" }}
            >
              Retry payment
            </button>
            {onRetryInit && (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  onRetryInit();
                }}
                className="h-8 px-3 bg-white text-foreground border border-border rounded-lg text-xs font-semibold cursor-pointer"
              >
                Start a new payment session
              </button>
            )}
          </div>
        </div>
      )}
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
  const [payState, setPayState] = useState<PayState | null>(null);
  const [amountMismatch, setAmountMismatch] = useState<string | null>(null);


  const loadOrderAndInit = async () => {
    if (!order_id || !user) return;
    logCheckout("load-start", { order_id, userId: user.id });
    setErr(null);
    setAmountMismatch(null);
    setLoading(true);
    setClientSecret(null);
    setStripePromise(null);
    setOrder(null);
    setSeller(null);
    setGig(null);
    setPayState(null);

    const { data: o, error } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, seller_id, price, status, project_title, delivery_deadline, stripe_payment_intent_id, gig_id",
      )
      .eq("id", order_id)
      .maybeSingle();
    if (error || !o) {
      logCheckout("order-load-failed", { error, hasOrder: !!o });
      setErr("Project not found");
      setLoading(false);
      return;
    }
    logCheckout("order-loaded", { id: o.id, status: o.status, price: o.price });
    if (o.buyer_id !== user.id) {
      logCheckout("order-not-buyer", { buyer_id: o.buyer_id, userId: user.id });
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
      logCheckout("order-status-skip", { status: o.status });
      nav(`/orders/${o.id}`, { replace: true });
      return;
    }

    try {
      logCheckout("invoke-stripe-payment-intent", { order_id: o.id });
      const invokePromise = supabase.functions.invoke("stripe-payment-intent", {
        body: { order_id: o.id },
      });
      const { data: pi, error: piErr } = (await Promise.race([
        invokePromise,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Payment failed - please try again")), 10000),
        ),
      ])) as Awaited<typeof invokePromise>;
      logCheckout("invoke-stripe-payment-intent-result", {
        hasData: !!pi,
        hasClientSecret: !!pi?.client_secret,
        hasPublishableKey: !!pi?.publishable_key,
        dataError: pi?.error,
        invokeError: piErr ? { name: piErr.name, message: piErr.message } : null,
      });
      if (piErr || !pi?.client_secret) {
        let rawStatus: number | null = null;
        let rawBody: string | null = null;
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
          const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
          const raw = await fetch(`${SUPABASE_URL}/functions/v1/stripe-payment-intent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ order_id: o.id }),
          });
          rawStatus = raw.status;
          rawBody = await raw.text();
          logCheckout("raw-pi-status", rawStatus);
          logCheckout("raw-pi-body", rawBody);
        } catch (rawErr) {
          logCheckout("raw-pi-fetch-threw", { message: (rawErr as Error).message });
        }
        const detail =
          rawStatus != null
            ? ` (HTTP ${rawStatus}${rawBody ? `: ${rawBody.slice(0, 300)}` : ""})`
            : "";
        setErr(
          (piErr?.message || pi?.error || "Could not initialize payment") + detail,
        );
        setLoading(false);
        return;
      }
      // Amount-integrity guard: cross-check displayed total, PaymentIntent amount,
      // and the linked custom offer (if any). Block checkout on any mismatch.
      const expectedFee = Math.round(o.price * 0.05);
      const expectedTotalCents = (o.price + expectedFee) * 100;
      const piAmount = (pi as any).amount as number | undefined;
      const offerCentsFromServer = (pi as any).custom_offer_price_cents as number | null | undefined;

      const { data: offerRow } = await supabase
        .from("custom_offers")
        .select("price")
        .eq("order_id", o.id)
        .maybeSingle();
      const offerCents = (offerRow?.price as number | undefined) ?? offerCentsFromServer ?? null;

      const mismatches: string[] = [];
      if (typeof piAmount === "number" && piAmount !== expectedTotalCents) {
        mismatches.push(
          `PaymentIntent amount $${(piAmount / 100).toFixed(2)} does not match displayed total $${(expectedTotalCents / 100).toFixed(2)}.`,
        );
      }
      if (offerCents != null) {
        const offerDollars = offerCents / 100;
        if (Math.round(offerDollars) !== o.price) {
          mismatches.push(
            `Custom offer amount $${offerDollars.toFixed(2)} does not match order price $${o.price}.`,
          );
        }
      }
      if (mismatches.length > 0) {
        logCheckout("amount-mismatch", { piAmount, expectedTotalCents, offerCents, orderPrice: o.price });
        setAmountMismatch(mismatches.join(" "));
        setLoading(false);
        return;
      }
      setAmountMismatch(null);

      logCheckout("loadStripe-start");
      setClientSecret(pi.client_secret);
      const sp = loadStripe(pi.publishable_key);
      sp.then((s) => logCheckout("loadStripe-resolved", { ok: !!s }))
        .catch((e) => logCheckout("loadStripe-failed", { message: (e as Error).message }));
      setStripePromise(sp);

    } catch (e) {
      logCheckout("invoke-stripe-payment-intent-threw", { message: (e as Error).message, error: e });
      setErr((e as Error).message || "Could not initialize payment");
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav(`/login?redirect=/checkout/${order_id}`);
      return;
    }
    loadOrderAndInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, order_id]);

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
        <main className="flex-1 container-page py-10 text-sm">
          <div className="mb-3">{err ?? "Project not found"}</div>
          <button
            type="button"
            onClick={loadOrderAndInit}
            className="h-10 px-4 rounded-[10px] text-white font-semibold text-sm"
            style={{ background: "#16A34A" }}
          >
            Try again
          </button>
        </main>
        <SiteFooter />
      </div>
    );

  const deadline = order.delivery_deadline ? new Date(order.delivery_deadline) : null;
  const itemTitle = gig?.title || order.project_title || "Project";
  const itemSubtitle = order.gig_id ? "Standard package" : "Custom project";
  const thumb = gig?.thumbnail_url || "/placeholder.svg";
  const sellerName = seller?.full_name || seller?.username || "Expert";
  const sellerAvatar = seller?.avatar_url || "/placeholder.svg";
  const sellerInitials = (() => {
    const parts = sellerName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "K";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  })();
  const amountLabel = order.gig_id ? "Selected package" : "Project amount";

  const sidebarBtnBg = payState?.succeeded
    ? "#15803D"
    : payState?.disabled && !payState?.busy
    ? "#4B5563"
    : "#0A0A0A";
  const sidebarBtnLabel = payState?.label ?? `Pay Now — $${total}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7]">
      <SiteHeader />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <div className="eyebrow mb-2">Checkout</div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Confirm and pay
          </h1>
        </div>

        <TooltipProvider delayDuration={150}>
          <div className="checkout-grid">
            <style>{`
              .checkout-grid {
                display: grid;
                grid-template-columns: 60% 40%;
                gap: 32px;
                align-items: start;
              }
              .checkout-left { min-width: 0; }
              .checkout-right { min-width: 0; }
              @media (max-width: 900px) {
                .checkout-grid { grid-template-columns: 1fr; gap: 16px; }
                .checkout-right { position: static !important; order: -1; }
                .checkout-left { order: 1; }
              }
            `}</style>

            {/* LEFT COLUMN */}
            <div className="checkout-left space-y-5">
              {/* Project card */}
              <div className="bg-white border border-border rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex gap-4 items-start">
                  <img
                    src={thumb}
                    alt={itemTitle}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-[#F7F7F7]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-semibold text-foreground leading-snug break-words">
                      {itemTitle}
                    </div>
                    <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full bg-[#F7F7F7] border border-border text-[12px] font-medium text-foreground-muted">
                      {itemSubtitle}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-border my-5" />

                <div className="flex items-center gap-3">
                  {seller?.avatar_url ? (
                    <img
                      src={sellerAvatar}
                      alt={sellerName}
                      className="w-10 h-10 rounded-full object-cover bg-[#F7F7F7]"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-[#16A34A] text-white text-[13px] font-semibold"
                    >
                      {sellerInitials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-foreground">
                      {sellerName}
                    </div>
                    {deadline && (
                      <div className="flex items-center gap-1.5 text-[12px] text-foreground-subtle mt-0.5">
                        <Clock size={12} />
                        Delivery by {deadline.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* Payment method card */}
              <div className="bg-white border border-border rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <h2 className="text-[15px] font-semibold text-foreground mb-4">
                  Pay with
                </h2>

                <div className="flex gap-2 mb-5">
                  {(
                    [
                      { id: "card", label: "Credit / Debit card" },
                      { id: "paypal", label: "PayPal" },
                    ] as const
                  ).map((opt) => {
                    const active = payMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPayMethod(opt.id)}
                        className="h-9 px-4 text-[13px] font-medium rounded-full transition-colors"
                        style={{
                          background: "#FFFFFF",
                          color: "#0A0A0A",
                          border: active
                            ? "2px solid #0A0A0A"
                            : "1px solid #EBEBEB",
                          padding: active ? "0 15px" : "0 16px",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>


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
                          colorBackground: "#FFFFFF",
                          borderRadius: "8px",
                          fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
                        },
                      },
                    }}
                  >
                    <PayBlock
                      orderId={order.id}
                      total={total}
                      payMethod={payMethod}
                      onPayStateChange={setPayState}
                      onRetryInit={loadOrderAndInit}
                      hideInternalButton
                    />
                  </Elements>
                ) : amountMismatch ? (
                  <div className="rounded-[12px] border border-red-200 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-[14px] font-semibold text-red-700 mb-1">
                          Payment blocked for your protection
                        </div>
                        <div className="text-[13px] text-red-600 leading-relaxed">
                          The amount shown on this checkout does not match the agreed price in the custom offer. To prevent an incorrect charge, payment has been blocked.
                        </div>
                        <div className="mt-3 text-[13px] text-red-600">
                          Please contact your seller or Katexs support to resolve this before proceeding.
                        </div>
                        {amountMismatch && (
                          <div className="mt-3 text-[12px] text-red-500 font-mono bg-red-100 rounded-lg px-3 py-2 break-all">
                            {amountMismatch}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    aria-label="Loading payment form"
                    className="rounded-[12px] border border-border bg-white p-4 min-h-[220px]"
                    style={{
                      background:
                        "linear-gradient(90deg,#f3f4f6 0%,#e5e7eb 50%,#f3f4f6 100%)",
                      backgroundSize: "200% 100%",
                      animation: "kxshimmer 1.2s infinite linear",
                    }}
                  />

                )}
              </div>

              {/* Promo code collapsible */}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPromo((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors"
                >
                  <span className="flex items-center gap-2 text-[14px] font-medium text-foreground">
                    <Tag size={14} className="text-foreground-subtle" />
                    Apply promo code
                  </span>
                  {showPromo ? (
                    <ChevronDown size={16} className="text-foreground-subtle" />
                  ) : (
                    <ChevronRight size={16} className="text-foreground-subtle" />
                  )}
                </button>
                {showPromo && (
                  <div className="px-5 pb-5 pt-1 flex gap-2">
                    <input
                      type="text"
                      value={promo}
                      onChange={(e) => setPromo(e.target.value)}
                      placeholder="Enter promo code"
                      className="flex-1 h-11 px-3.5 rounded-[10px] border border-border bg-white text-[14px] outline-none focus:border-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => toast.message("Promo codes coming soon")}
                      className="h-11 px-5 rounded-[10px] bg-foreground text-background text-[14px] font-medium"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <aside className="checkout-right sticky top-24">
              <div className="bg-white border border-border rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <h2 className="text-[17px] font-bold text-foreground mb-5 tracking-tight">
                  Order summary
                </h2>

                <div className="flex justify-between py-1.5 text-[14px]">
                  <span className="text-foreground-muted">{amountLabel}</span>
                  <span className="text-foreground tabular-nums">${order.price}</span>
                </div>
                <div className="flex justify-between py-1.5 text-[14px]">
                  <span className="text-foreground-muted flex items-center gap-1.5">
                    Katexs service fee (5%)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="About the service fee" className="inline-flex">
                          <Info size={13} className="text-foreground-subtle" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs">
                        Covers secure escrow payments, dispute protection, and 24/7 support.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="text-foreground tabular-nums">${partnerFee}</span>
                </div>

                <div className="h-px bg-border my-4" />

                <div className="flex justify-between items-baseline mb-5">
                  <span className="text-[14px] font-medium text-foreground">Total</span>
                  <span className="text-[22px] font-bold text-foreground tabular-nums">
                    ${total}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => !amountMismatch && payState?.onPay()}
                  disabled={!payState || payState.disabled || !!amountMismatch}
                  className="w-full text-white font-semibold text-[15px] rounded-[12px] h-[52px] transition-colors"
                  style={{
                    background: amountMismatch ? "#9CA3AF" : sidebarBtnBg,
                    cursor: payState?.busy
                      ? "wait"
                      : !payState || payState.disabled || amountMismatch
                      ? "not-allowed"
                      : "pointer",
                    opacity: payState?.busy ? 0.85 : 1,
                  }}
                >
                  {amountMismatch ? "Payment blocked" : sidebarBtnLabel}
                </button>


                <div className="flex items-center justify-center gap-1.5 mt-3 text-[12px] text-foreground-subtle">
                  <ShieldCheck size={13} /> Secure 256-bit SSL encryption
                </div>

                <div className="h-px bg-border my-4" />

                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2 text-[13px] text-foreground-muted">
                    <Check size={14} className="text-[#16A34A]" />
                    Money-back guarantee
                  </li>
                  <li className="flex items-center gap-2 text-[13px] text-foreground-muted">
                    <Check size={14} className="text-[#16A34A]" />
                    3-day delivery guarantee
                  </li>
                </ul>


                <div className="mt-4 text-[11px] text-foreground-subtle text-center leading-relaxed">
                  By clicking Pay Now you agree to Katexs Terms of Service and Payment Terms.
                </div>
              </div>
            </aside>
          </div>

          {/* Trust bar */}
          <div className="mt-10 pt-6 border-t border-border">
            <div className="flex flex-wrap items-center justify-center gap-8 text-[13px] text-foreground-muted">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-foreground-subtle" />
                Secure Payment
              </div>
              <div className="flex items-center gap-2">
                <RefreshCcw size={16} className="text-foreground-subtle" />
                Money-back Guarantee
              </div>
              <div className="flex items-center gap-2">
                <Headphones size={16} className="text-foreground-subtle" />
                24/7 Support
              </div>
            </div>
          </div>
        </TooltipProvider>
      </main>
      <SiteFooter />
    </div>
  );
}
