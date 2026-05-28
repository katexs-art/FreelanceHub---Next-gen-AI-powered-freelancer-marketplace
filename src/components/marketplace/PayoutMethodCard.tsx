import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Mail, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Method = "stripe_bank" | "paypal" | null;

interface Props {
  method: Method;
  paypalEmail: string | null;
  bankCountry: string | null;
  bankLast4: string | null;
  onSaved: () => void;
}

export function PayoutMethodCard({ method, paypalEmail, bankCountry, bankLast4, onSaved }: Props) {
  const [tab, setTab] = useState<"stripe_bank" | "paypal">(method ?? "stripe_bank");
  const [paypal, setPaypal] = useState(paypalEmail ?? "");
  const [country, setCountry] = useState(bankCountry ?? "US");
  const [routing, setRouting] = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [busy, setBusy] = useState(false);

  const savePaypal = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypal)) return toast.error("Enter a valid PayPal email");
    setBusy(true);
    const { error } = await supabase.functions.invoke("payout-method-save", {
      body: { method: "paypal", paypal_email: paypal },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("PayPal payout saved");
    onSaved();
  };

  const saveBank = async () => {
    if (!accountHolder.trim()) return toast.error("Account holder name required");
    if (!accountNum.trim()) return toast.error("Account number required");
    setBusy(true);
    try {
      const pubKey = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
      if (!pubKey) throw new Error("Stripe publishable key not configured");

      // Tokenize via Stripe REST (no SDK needed). For US use routing+account; other countries use IBAN-style account_number only.
      const form = new URLSearchParams();
      form.set("bank_account[country]", country);
      form.set("bank_account[currency]", country === "US" ? "usd" : country === "GB" ? "gbp" : "eur");
      form.set("bank_account[account_holder_name]", accountHolder);
      form.set("bank_account[account_holder_type]", "individual");
      form.set("bank_account[account_number]", accountNum.replace(/\s+/g, ""));
      if (country === "US" && routing) form.set("bank_account[routing_number]", routing);

      const tokRes = await fetch("https://api.stripe.com/v1/tokens", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pubKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
      const tok = await tokRes.json();
      if (!tokRes.ok) throw new Error(tok?.error?.message || "Could not tokenize bank account");

      const { error } = await supabase.functions.invoke("payout-method-save", {
        body: { method: "stripe_bank", country, bank_token: tok.id },
      });
      if (error) throw new Error(error.message);
      toast.success("Bank account saved");
      setRouting(""); setAccountNum(""); setAccountHolder("");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Could not save bank account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-background border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold">Payout method</h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            Choose how you want to receive your earnings. Buyers always pay through our platform.
          </p>
        </div>
        {method && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success bg-success/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active
          </span>
        )}
      </div>

      {method && (
        <div className="mb-5 rounded-lg border border-border bg-background-elevated p-4 text-sm flex items-center gap-3">
          {method === "stripe_bank" ? <Building2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          <div>
            <div className="font-medium">
              {method === "stripe_bank" ? `Bank transfer (${bankCountry})` : "PayPal"}
            </div>
            <div className="text-foreground-muted text-xs">
              {method === "stripe_bank" ? `Account ending in ${bankLast4 ?? "••••"}` : paypalEmail}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <TabBtn active={tab === "stripe_bank"} onClick={() => setTab("stripe_bank")} icon={Building2}>Bank transfer</TabBtn>
        <TabBtn active={tab === "paypal"} onClick={() => setTab("paypal")} icon={Mail}>PayPal</TabBtn>
      </div>

      {tab === "paypal" ? (
        <div className="space-y-3 max-w-md">
          <Input placeholder="your@paypal.com" value={paypal} onChange={(e) => setPaypal(e.target.value)} />
          <Button onClick={savePaypal} disabled={busy || !paypal}>Save PayPal</Button>
        </div>
      ) : (
        <div className="space-y-3 max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={country} onChange={(e) => setCountry(e.target.value)}
              className="bg-background border border-border rounded-md h-10 px-3 text-sm"
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="NL">Netherlands</option>
              <option value="ES">Spain</option>
              <option value="IT">Italy</option>
            </select>
            <Input placeholder="Account holder name" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
          </div>
          {country === "US" && (
            <Input placeholder="Routing number (9 digits)" value={routing} onChange={(e) => setRouting(e.target.value)} />
          )}
          <Input placeholder={country === "US" ? "Account number" : "IBAN"} value={accountNum} onChange={(e) => setAccountNum(e.target.value)} />
          <Button onClick={saveBank} disabled={busy}>Save bank account</Button>
          <p className="text-xs text-foreground-muted">
            Bank details are tokenized by Stripe — they never touch our servers.
          </p>
        </div>
      )}
    </section>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm px-3 h-9 rounded-md border transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-background-elevated",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}
