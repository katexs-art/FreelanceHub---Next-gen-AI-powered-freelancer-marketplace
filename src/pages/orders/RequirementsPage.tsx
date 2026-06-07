import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

interface Requirement {
  id: string;
  question: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
}

export default function RequirementsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deliveryDays, setDeliveryDays] = useState<number>(7);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .select("id, buyer_id, gig_id, package_id, requirements_submitted, status")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (oErr || !order) { setError(oErr?.message ?? "Order not found"); setLoading(false); return; }
      if (order.buyer_id !== user.id) { nav(`/orders/${id}`, { replace: true }); return; }
      if (order.requirements_submitted) { nav(`/orders/${id}`, { replace: true }); return; }

      const [reqsRes, pkgRes] = await Promise.all([
        order.gig_id
          ? supabase.from("gig_requirements").select("*").eq("gig_id", order.gig_id).order("sort_order")
          : Promise.resolve({ data: [], error: null } as any),
        order.package_id
          ? supabase.from("gig_packages").select("delivery_days").eq("id", order.package_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);
      if (cancelled) return;
      setReqs((reqsRes.data as any) ?? []);
      setDeliveryDays((pkgRes.data as any)?.delivery_days ?? 7);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, user, nav]);

  const submit = async () => {
    if (!id) return;
    const missing = reqs.filter((r) => r.is_required && !answers[r.id]?.trim());
    if (missing.length) { toast.error(`Please answer: ${missing[0].question}`); return; }
    setBusy(true);
    try {
      const rows = reqs
        .filter((r) => answers[r.id]?.trim())
        .map((r) => ({ order_id: id, requirement_id: r.id, answer: answers[r.id] }));
      if (rows.length) {
        const { error: aErr } = await supabase.from("order_requirements_answers").insert(rows);
        if (aErr) throw aErr;
      }
      const deadline = new Date(Date.now() + deliveryDays * 86400000).toISOString();
      const { error: uErr } = await supabase.from("orders").update({
        requirements_submitted: true,
        requirements_submitted_at: new Date().toISOString(),
        status: "active",
        delivery_deadline: deadline,
      }).eq("id", id);
      if (uErr) throw uErr;
      toast.success("Requirements sent — your project is now in progress");
      nav(`/orders/${id}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit requirements");
    } finally {
      setBusy(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: 8, color: "#ffffff", fontSize: 14, padding: "10px 12px",
    outline: "none", resize: "vertical", boxSizing: "border-box",
  };

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#888", fontSize: 14 }}>Loading requirements…</span>
        </div>
        <SiteFooter />
      </>
    );
  }

  if (error) {
    return (
      <>
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 40, textAlign: "center", maxWidth: 400 }}>
            <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Unable to load</h1>
            <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>{error}</p>
            <Link to="/buyer/orders" style={{ color: "#16A34A", fontSize: 13 }}>← Back to orders</Link>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px 0" }}>

          {/* Back */}
          <button
            onClick={() => nav(`/orders/${id}`)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}
          >
            <ChevronLeft size={14} /> Back to order
          </button>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#ffffff", margin: "0 0 8px" }}>
            Send your requirements
          </h1>
          <p style={{ fontSize: 14, color: "#888", margin: "0 0 28px", lineHeight: 1.6 }}>
            Answer the expert's questions so they can start your project. The {deliveryDays}-day delivery clock starts when you submit.
          </p>

          <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {reqs.length === 0 ? (
              <p style={{ fontSize: 14, color: "#888", fontStyle: "italic" }}>
                The expert didn't define any questions for this package. Submit to start the project.
              </p>
            ) : (
              reqs.map((r) => (
                <div key={r.id}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#e0e0e0", marginBottom: 8 }}>
                    {r.question}
                    {r.is_required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={answers[r.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [r.id]: e.target.value }))}
                    onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = "#16A34A"; }}
                    onBlur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = "#2a2a2a"; }}
                    style={inp}
                  />
                </div>
              ))
            )}

            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button
                onClick={submit}
                disabled={busy}
                style={{
                  padding: "11px 24px", borderRadius: 8,
                  background: busy ? "#1a3a1a" : "#16A34A",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                  border: "none", cursor: busy ? "default" : "pointer",
                }}
              >
                {busy ? "Sending…" : "Submit and start project"}
              </button>
              <button
                onClick={() => nav(`/orders/${id}`)}
                style={{
                  padding: "11px 20px", borderRadius: 8,
                  background: "transparent", border: "1px solid #2a2a2a",
                  color: "#888", fontSize: 14, cursor: "pointer",
                }}
              >
                Back to order
              </button>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
