import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, TrendingUp, Clock, ArrowDownToLine, CheckCircle2, Building2, Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PayoutMethodCard } from "@/components/marketplace/PayoutMethodCard";
import { StripeConnectCard } from "@/components/marketplace/StripeConnectCard";
import { EmptyState } from "@/components/EmptyState";

interface Acct {
  available_balance: number; pending_balance: number; lifetime_earnings: number;
  payout_method: "stripe_bank" | "paypal" | null;
  paypal_email: string | null;
  bank_country: string | null;
  bank_last4: string | null;
  charges_enabled: boolean | null;
  payouts_enabled: boolean | null;
  stripe_account_id: string | null;
}
interface Tx { id: string; type: string; status: string; amount: number; created_at: string; clears_at: string | null; order_id: string | null; }
interface Wd { id: string; amount: number; status: string; created_at: string; paid_at: string | null; }

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function Earnings() {
  const { user } = useAuth();
  const [acct, setAcct] = useState<Acct | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [wds, setWds] = useState<Wd[]>([]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: a }, { data: t }, { data: w }] = await Promise.all([
      supabase.from("seller_accounts")
        .select("available_balance, pending_balance, lifetime_earnings, payout_method, paypal_email, bank_country, bank_last4, charges_enabled, payouts_enabled, stripe_account_id")
        .eq("seller_id", user.id).maybeSingle(),
      supabase.from("transactions").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("withdrawals").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setAcct(a as any); setTxs((t ?? []) as Tx[]); setWds((w ?? []) as Wd[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const hasMethod = !!acct?.payout_method;
  const stripeReady = !!(acct?.stripe_account_id && acct?.payouts_enabled);

  const requestWithdrawal = async () => {
    if (!user || !acct) return;
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents < 1000) return toast.error("Minimum withdrawal is $10");
    if (cents > acct.available_balance) return toast.error("Amount exceeds available balance");

    if (stripeReady) {
      setBusy(true);
      const { data, error } = await supabase.functions.invoke("stripe-instant-payout", { body: { amount_cents: cents } });
      setBusy(false);
      if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Payout failed");
      toast.success((data as any)?.method === "stripe_instant" ? "Payout sent — typically arrives instantly" : "Payout sent — arrives in 1–2 business days");
      setAmount(""); load();
      return;
    }

    if (!hasMethod) return toast.error("Add a payout method first");
    setBusy(true);
    const { error } = await supabase.from("withdrawals").insert({ seller_id: user.id, amount: cents, method: acct.payout_method });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal requested — payout in 1–3 business days");
    setAmount(""); load();
  };

  return (
    <AppShell>
      <div className="max-w-4xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-sm text-foreground-muted mt-1">Track your balance, ledger, and withdrawals.</p>
        </header>

        {(acct?.lifetime_earnings ?? 0) === 0 && txs.length === 0 && wds.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No earnings yet"
            message="Complete your profile and start receiving orders."
            action={{ label: "Complete Profile", to: "/seller-onboarding" }}
          />
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <Card icon={Wallet} label="Available" value={dollars(acct?.available_balance ?? 0)} />
            <Card icon={Clock} label="Pending" value={dollars(acct?.pending_balance ?? 0)} />
            <Card icon={TrendingUp} label="Lifetime" value={dollars(acct?.lifetime_earnings ?? 0)} />
          </div>
        )}

        <StripeConnectCard />


        <PayoutMethodCard
          method={acct?.payout_method ?? null}
          paypalEmail={acct?.paypal_email ?? null}
          bankCountry={acct?.bank_country ?? null}
          bankLast4={acct?.bank_last4 ?? null}
          onSaved={load}
        />

        <section className="bg-background border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-1">Withdraw funds</h2>
          <p className="text-sm text-foreground-muted mb-4">
            Minimum $10. {stripeReady ? "Instant for debit cards, 1–2 business days for bank accounts." : "Payouts processed within 3 business days."}
          </p>
          <div className="flex gap-2 max-w-sm">
            <Input type="number" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button onClick={requestWithdrawal} disabled={busy || !amount || (!stripeReady && !hasMethod)}>
              <ArrowDownToLine className="h-4 w-4" /> Withdraw
            </Button>
          </div>
          {!stripeReady && !hasMethod && (
            <p className="text-xs text-foreground-muted mt-3">Connect a payout account above to enable withdrawals.</p>
          )}
        </section>


        <section>
          <h2 className="font-semibold mb-3">Withdrawals</h2>
          {wds.length === 0 ? (
            <p className="text-sm text-foreground-muted">No withdrawals yet.</p>
          ) : (
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background-elevated text-xs text-foreground-muted">
                  <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Status</th></tr>
                </thead>
                <tbody>
                  {wds.map((w) => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="p-3">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{dollars(w.amount)}</td>
                      <td className="p-3"><StatusPill status={w.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-semibold mb-3">Transactions</h2>
          {txs.length === 0 ? (
            <p className="text-sm text-foreground-muted">No transactions yet.</p>
          ) : (
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background-elevated text-xs text-foreground-muted">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">Clears</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="p-3">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="p-3 capitalize">{t.type.replace("_", " ")}</td>
                      <td className={cn("p-3 font-medium", (t.type === "platform_fee" || t.type === "refund" || t.amount < 0) ? "text-destructive" : "")}>
                        {(t.type === "platform_fee" || t.type === "refund" || t.amount < 0) ? "-" : "+"}{dollars(Math.abs(t.amount))}
                      </td>
                      <td className="p-3 text-foreground-muted">{t.clears_at ? new Date(t.clears_at).toLocaleDateString() : "—"}</td>
                      <td className="p-3"><StatusPill status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Card({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-xs text-foreground-muted"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "paid" || status === "cleared" ? "bg-success/10 text-success" :
    status === "failed" || status === "reversed" ? "bg-destructive/10 text-destructive" :
    "bg-warning/10 text-warning";
  return <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", tone)}>{status}</span>;
}
