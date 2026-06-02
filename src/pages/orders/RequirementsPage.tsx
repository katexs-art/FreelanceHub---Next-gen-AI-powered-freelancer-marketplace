import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
      if (oErr || !order) {
        setError(oErr?.message ?? "Order not found");
        setLoading(false);
        return;
      }
      if (order.buyer_id !== user.id) {
        nav(`/orders/${id}`, { replace: true });
        return;
      }
      if (order.requirements_submitted) {
        nav(`/orders/${id}`, { replace: true });
        return;
      }
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
    if (missing.length) {
      toast.error(`Please answer: ${missing[0].question}`);
      return;
    }
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
      const { error: uErr } = await supabase
        .from("orders")
        .update({
          requirements_submitted: true,
          requirements_submitted_at: new Date().toISOString(),
          status: "active",
          delivery_deadline: deadline,
        })
        .eq("id", id);
      if (uErr) throw uErr;
      toast.success("Requirements sent — your project is now in progress");
      nav(`/orders/${id}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit requirements");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl"><div className="text-sm text-foreground-muted">Loading requirements…</div></div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-2xl">
          <div className="bg-background border border-border rounded-xl p-8 text-center">
            <h1 className="text-lg font-semibold mb-1">Unable to load</h1>
            <p className="text-sm text-foreground-muted mb-4">{error}</p>
            <Button variant="outline" asChild><Link to="/orders">Back to orders</Link></Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Send your requirements</h1>
        <p className="text-sm text-foreground-muted mb-6">
          Answer the seller's questions so they can start the project. The {deliveryDays}-day delivery clock starts when you submit.
        </p>

        <div className="bg-background border border-border rounded-xl p-6 space-y-5">
          {reqs.length === 0 ? (
            <p className="text-sm text-foreground-muted italic">
              The seller didn't define any questions for this package. Confirm to start the project.
            </p>
          ) : (
            reqs.map((r) => (
              <div key={r.id}>
                <label className="block text-sm font-medium mb-1.5">
                  {r.question} {r.is_required && <span className="text-destructive">*</span>}
                </label>
                <Textarea
                  value={answers[r.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [r.id]: e.target.value }))}
                  rows={3}
                />
              </div>
            ))
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={submit} disabled={busy}>
              {busy ? "Sending…" : "Submit and start project"}
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/orders/${id}`}>Back to order</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
