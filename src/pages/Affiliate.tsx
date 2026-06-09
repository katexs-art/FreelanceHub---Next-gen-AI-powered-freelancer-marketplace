import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Copy, DollarSign, Loader2, MousePointer, TrendingUp, UserPlus } from "lucide-react";

/* ─── types ──────────────────────────────────────────── */
interface AffiliateRow {
  id: string;
  affiliate_code: string;
  clicks: number;
  signups: number;
  conversions: number;
  total_earned: number;   // cents
  pending_payout: number; // cents
  paid_out: number;       // cents
  status: string;
}
interface Conversion {
  id: string;
  order_amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
}
interface Payout {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/* ─── affiliate tracking hook (reads ?ref cookie) ───── */
export function useAffiliateTracking() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    // Store for 30 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    document.cookie = `aff_ref=${encodeURIComponent(ref)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    // Fire click via RPC (best-effort)
    supabase.rpc("record_affiliate_click", {
      p_code: ref,
      p_page_url: window.location.href,
    }).catch(() => {/* silent */});
  }, []);
}

export function getStoredAffCode(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)aff_ref=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/* ─── main page ──────────────────────────────────────── */
export default function Affiliate() {
  const { user, profile } = useAuth();
  const [aff, setAff] = useState<AffiliateRow | null>(null);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState("");
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  useAffiliateTracking();

  /* load affiliate data */
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    const [affRes, convRes, payRes] = await Promise.all([
      supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("affiliate_conversions").select("*")
        .eq("affiliate_id", (await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle()).data?.id ?? "")
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("affiliate_payouts").select("*")
        .eq("affiliate_id", (await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle()).data?.id ?? "")
        .order("requested_at", { ascending: false }).limit(10),
    ]);
    setAff(affRes.data as AffiliateRow | null);
    setConversions((convRes.data ?? []) as Conversion[]);
    setPayouts((payRes.data ?? []) as Payout[]);
    setLoading(false);
  };

  const joinProgram = async () => {
    if (!user) return;
    setJoining(true);
    const { data, error } = await supabase.rpc("join_affiliate_program");
    setJoining(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to the affiliate program!");
    await loadData();
  };

  const copyLink = () => {
    if (!aff) return;
    const url = `${window.location.origin}/?ref=${aff.affiliate_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const requestPayout = async () => {
    if (!aff || !user) return;
    if (aff.pending_payout < 5000) { toast.error("Minimum payout is $50"); return; }
    if (!payoutEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { toast.error("Enter a valid PayPal email"); return; }
    setRequestingPayout(true);
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_id: aff.id,
      amount: aff.pending_payout,
      method: "paypal",
      payout_email: payoutEmail,
      status: "pending",
    });
    setRequestingPayout(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Payout requested! We'll process it within 3–5 business days.");
    setShowPayoutForm(false);
    await loadData();
  };

  const refUrl = aff ? `${window.location.origin}/?ref=${aff.affiliate_code}` : "";

  /* ── not logged in ───────────────────────────────── */
  if (!user) {
    return (
      <PageShell>
        <HeroSection />
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <Link to="/signup" style={{ display: "inline-block", background: "#22c55e", color: "#000", fontWeight: 700, fontSize: 16, padding: "14px 40px", borderRadius: 10, textDecoration: "none" }}>
            Create a free account to join
          </Link>
          <p style={{ color: "#666", fontSize: 14, marginTop: 12 }}>Already have an account? <Link to="/login" style={{ color: "#22c55e", textDecoration: "none" }}>Sign in</Link></p>
        </div>
      </PageShell>
    );
  }

  /* ── loading ─────────────────────────────────────── */
  if (loading) {
    return (
      <PageShell>
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={32} color="#22c55e" style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageShell>
    );
  }

  /* ── not yet enrolled ────────────────────────────── */
  if (!aff) {
    return (
      <PageShell>
        <HeroSection />
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button onClick={joinProgram} disabled={joining} style={{ background: "#22c55e", color: "#000", fontWeight: 700, fontSize: 16, padding: "14px 40px", borderRadius: 10, border: "none", cursor: joining ? "not-allowed" : "pointer", opacity: joining ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: 10 }}>
            {joining && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            {joining ? "Joining…" : "Join the Affiliate Program — It's Free"}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageShell>
    );
  }

  /* ── dashboard ───────────────────────────────────── */
  const pendingDollars = aff.pending_payout / 100;
  const canRequestPayout = pendingDollars >= 50;

  return (
    <PageShell>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#fff" }}>Affiliate Dashboard</h1>
          <p style={{ fontSize: 14, color: "#888", margin: "6px 0 0" }}>Earn 40% commission on every completed order you refer.</p>
        </div>
        <span style={{ background: aff.status === "active" ? "rgba(34,197,94,0.12)" : "#1a1a1a", color: aff.status === "active" ? "#22c55e" : "#888", border: `1px solid ${aff.status === "active" ? "rgba(34,197,94,0.3)" : "#333"}`, borderRadius: 999, padding: "4px 14px", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {aff.status}
        </span>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard icon={<MousePointer size={18} />} label="Total Clicks" value={aff.clicks.toLocaleString()} />
        <StatCard icon={<UserPlus size={18} />}     label="Signups"      value={aff.signups.toLocaleString()} />
        <StatCard icon={<TrendingUp size={18} />}   label="Conversions"  value={aff.conversions.toLocaleString()} />
        <StatCard icon={<DollarSign size={18} />}   label="Total Earned" value={fmt(aff.total_earned)} accent />
        <StatCard icon={<DollarSign size={18} />}   label="Pending"      value={fmt(aff.pending_payout)} />
        <StatCard icon={<DollarSign size={18} />}   label="Paid Out"     value={fmt(aff.paid_out)} />
      </div>

      {/* referral link */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px", color: "#fff" }}>Your Referral Link</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#888", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {refUrl}
          </div>
          <button onClick={copyLink} style={{ display: "flex", alignItems: "center", gap: 7, background: copied ? "rgba(34,197,94,0.15)" : "#1a1a1a", border: `1px solid ${copied ? "#22c55e" : "#333"}`, color: copied ? "#22c55e" : "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#555", margin: "10px 0 0" }}>
          Share this link anywhere. Cookies last 30 days — you earn commission on any purchase made within that window.
        </p>
      </div>

      {/* payout */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "#fff" }}>Payout Balance</h2>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#22c55e", margin: 0 }}>{fmt(aff.pending_payout)}</p>
            <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>Minimum payout: $50 via PayPal</p>
          </div>
          {!showPayoutForm && (
            <button onClick={() => setShowPayoutForm(true)} disabled={!canRequestPayout} style={{ background: canRequestPayout ? "#22c55e" : "#1a1a1a", border: `1px solid ${canRequestPayout ? "#22c55e" : "#333"}`, color: canRequestPayout ? "#000" : "#555", fontWeight: 600, fontSize: 14, borderRadius: 8, padding: "10px 22px", cursor: canRequestPayout ? "pointer" : "not-allowed" }}>
              {canRequestPayout ? "Request Payout" : `Need ${fmt(5000 - aff.pending_payout)} more`}
            </button>
          )}
        </div>

        {showPayoutForm && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #1e1e1e" }}>
            <p style={{ fontSize: 13, color: "#aaa", margin: "0 0 10px" }}>PayPal email for payout of <strong style={{ color: "#fff" }}>{fmt(aff.pending_payout)}</strong>:</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} placeholder="your@paypal.com" style={{ flex: 1, minWidth: 200, background: "#0d0d0d", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, padding: "10px 14px", outline: "none" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")} onBlur={(e) => (e.currentTarget.style.borderColor = "#333")} />
              <button onClick={requestPayout} disabled={requestingPayout} style={{ background: "#22c55e", border: "none", color: "#000", fontWeight: 600, fontSize: 14, borderRadius: 8, padding: "10px 20px", cursor: requestingPayout ? "not-allowed" : "pointer", opacity: requestingPayout ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                {requestingPayout && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                {requestingPayout ? "Requesting…" : "Confirm"}
              </button>
              <button onClick={() => setShowPayoutForm(false)} style={{ background: "transparent", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "10px 16px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* conversions table */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", color: "#fff" }}>Recent Conversions</h2>
        {conversions.length === 0 ? (
          <p style={{ fontSize: 14, color: "#555" }}>No conversions yet. Share your link to start earning!</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                  {["Date", "Order Amount", "Commission (40%)", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#555", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conversions.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #141414" }}>
                    <td style={{ padding: "10px 12px", color: "#888" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "10px 12px", color: "#fff" }}>{fmt(c.order_amount)}</td>
                    <td style={{ padding: "10px 12px", color: "#22c55e", fontWeight: 600 }}>{fmt(c.commission_amount)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: c.status === "paid" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)", color: c.status === "paid" ? "#22c55e" : "#eab308", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* payout history */}
      {payouts.length > 0 && (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", color: "#fff" }}>Payout History</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {payouts.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #141414" }}>
                <div>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{fmt(p.amount)}</span>
                  <span style={{ color: "#555", fontSize: 12, marginLeft: 12 }}>{new Date(p.requested_at).toLocaleDateString()}</span>
                </div>
                <span style={{ background: p.status === "paid" ? "rgba(34,197,94,0.1)" : p.status === "pending" ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)", color: p.status === "paid" ? "#22c55e" : p.status === "pending" ? "#eab308" : "#ef4444", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageShell>
  );
}

/* ─── sub-components ─────────────────────────────────── */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader showCategories={false} />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
          {children}
        </div>
        <SiteFooter />
      </div>
    </>
  );
}

function HeroSection() {
  const PERKS = [
    { icon: "💸", title: "40% Commission", sub: "On every completed order you refer — one of the highest rates in the industry." },
    { icon: "🍪", title: "30-Day Cookie", sub: "If someone signs up within 30 days of clicking your link, you get credit." },
    { icon: "⚡", title: "Real-time Tracking", sub: "See clicks, signups, and conversions the moment they happen." },
    { icon: "💳", title: "Fast Payouts", sub: "Request your earnings via PayPal once you hit $50. Paid within 3–5 days." },
  ];

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 999, padding: "4px 14px", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Affiliate Program
        </span>
        <h1 style={{ fontSize: 40, fontWeight: 700, margin: "20px 0 16px", lineHeight: 1.2, color: "#fff" }}>
          Earn 40% on every<br />order you refer
        </h1>
        <p style={{ fontSize: 17, color: "#888", maxWidth: 480, margin: "0 auto" }}>
          Share your unique link. Earn commission when someone hires an expert on Katexs.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 48 }}>
        {PERKS.map((p) => (
          <div key={p.title} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{p.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{p.title}</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{p.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "#111", border: `1px solid ${accent ? "rgba(34,197,94,0.2)" : "#1e1e1e"}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ color: accent ? "#22c55e" : "#555", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? "#22c55e" : "#fff" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>{label}</div>
    </div>
  );
}
