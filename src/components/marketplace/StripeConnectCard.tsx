import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";

export function StripeConnectCard() {
  const [state, setState] = useState<{ onboarded: boolean; payouts: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("seller_accounts")
        .select("onboarding_complete, payouts_enabled").eq("seller_id", u.user.id).maybeSingle();
      setState({ onboarded: !!data?.onboarding_complete, payouts: !!data?.payouts_enabled });
    })();
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { return_url: window.location.href },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) { toast.error(e.message ?? "Failed to start onboarding"); }
    finally { setBusy(false); }
  };

  return (
    <section className="bg-background border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4" /> Automated payouts (Stripe Connect)
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            {state?.payouts
              ? "Bank connected. Withdrawals are automatically paid to your bank."
              : "Connect your bank to receive automatic payouts in 1–2 business days."}
          </p>
        </div>
        {state?.payouts ? (
          <span className="text-success text-sm flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Connected</span>
        ) : (
          <Button onClick={connect} disabled={busy}>
            <ExternalLink className="h-4 w-4" /> {state?.onboarded ? "Update" : "Connect bank"}
          </Button>
        )}
      </div>
    </section>
  );
}
