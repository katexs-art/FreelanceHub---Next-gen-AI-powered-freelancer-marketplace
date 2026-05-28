import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, TrendingUp, Clock, ArrowDownToLine, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Acct {
  available_balance: number; pending_balance: number; lifetime_earnings: number;
  stripe_account_id: string | null; onboarding_complete: boolean; payouts_enabled: boolean;
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
  const [params, setParams] = useSearchParams();

  const load = async () => {
    if (!user) return;
    const [{ data: a }, { data: t }, { data: w }] = await Promise.all([
      supabase.from("seller_accounts")
        .select("available_balance, pending_balance, lifetime_earnings, stripe_account_id, onboarding_complete, payouts_enabled")
        .eq("seller_id", user.id).maybeSingle(),
      supabase.from("transactions").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("withdrawals").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setAcct(a as any); setTxs((t ?? []) as Tx[]); setWds((w ?? []) as Wd[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  // After return from Stripe, refresh status
  useEffect(() => {
    if (params.get("connect")) {
      supabase.functions.invoke("stripe-connect-status").then(() => {
        load();
        params.delete("connect");
        setParams(params, { replace: true });
      });
    }
    // eslint-disable-next-line
  }, []);

  const startConnect = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
    setBusy(false);
    if (error || !data?.url) return toast.error(error?.message || "Could not start onboarding");
    window.location.href = data.url;
  };

  const requestWithdrawal = async () => {
    if (!user || !acct) return;
    if (!acct.payouts_enabled) return toast.error("Finish Stripe onboarding to withdraw");
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents < 1000) return toast.error("Minimum withdrawal is $10");
    if (cents > acct.available_balance) return toast.error("Amount exceeds available balance");
    setBusy(true);
    const { error } = await supabase.from("withdrawals").insert({ seller_id: user.id, amount: cents });
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

        <div className="grid sm:grid-cols-3 gap-4">
          <Card icon={Wallet} label="Available" value={dollars(acct?.available_balance ?? 0)} />
          <Card icon={Clock} label="Pending" value={dollars(acct?.pending_balance ?? 0)} />
          <Card icon={TrendingUp} label="Lifetime" value={dollars(acct?.lifetime_earnings ?? 0)} />
        </div>

        {/* Stripe Connect banner */}
        {acct && !acct.payouts_enabled && (
          <section className={cn("border rounded-xl p-5 flex items-start gap-4",
            acct.stripe_account_id ? "border-warning/40 bg-warning/5" : "border-border bg-background")}>
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
              acct.stripe_account_id ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary")}>
              {acct.stripe_account_id ? <AlertCircle className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">
                {acct.stripe_account_id ? "Finish your Stripe onboarding" : "Set up payouts"}
              </h3>
              <p className="text-sm text-foreground-muted mt-0.5">
                {acct.stripe_account_id
                  ? "A few more details are needed before we can release payouts."
                  : "Connect your bank in a few minutes to receive earnings directly to your account."}
              </p>
            </div>
            <Button onClick={startConnect} disabled={busy}>
              <ExternalLink className="h-4 w-4" /> {acct.stripe_account_id ? "Continue setup" : "Connect with Stripe"}
            </Button>
          </section>
        )}
        {acct?.payouts_enabled && (
          <section className="border border-success/40 bg-success/5 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-sm">Stripe payouts are active. Withdrawals are sent automatically.</span>
          </section>
        )}

        <section className="bg-background border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-1">Withdraw funds</h2>
          <p className="text-sm text-foreground-muted mb-4">Minimum $10. Payouts processed within 3 business days.</p>
          <div className="flex gap-2 max-w-sm">
            <Input type="number" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button onClick={requestWithdrawal} disabled={busy || !amount || !acct?.payouts_enabled}>
              <ArrowDownToLine className="h-4 w-4" /> Request
            </Button>
          </div>
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
                      <td className={cn("p-3 font-medium", t.type === "platform_fee" ? "text-destructive" : "")}>
                        {t.type === "platform_fee" ? "-" : "+"}{dollars(Math.abs(t.amount))}
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
