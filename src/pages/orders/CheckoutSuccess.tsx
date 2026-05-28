import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      const { data } = await supabase
        .from("orders").select("id")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!cancelled && data) { setOrderId(data.id); return; }
      if (++attempts < 10) setTimeout(tick, 1500);
    };
    tick();
    return () => { cancelled = true; };
  }, [user, sessionId]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container py-20 text-center max-w-lg mx-auto">
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold">Payment received</h1>
        <p className="text-foreground-muted mt-3">
          Your order is being created. Next, share your requirements with the seller so they can start.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          {orderId ? (
            <Button asChild size="lg"><Link to={`/orders/${orderId}`}>Open order</Link></Button>
          ) : (
            <Button size="lg" disabled>Preparing your order…</Button>
          )}
          <Button asChild size="lg" variant="outline"><Link to="/buyer/orders">All orders</Link></Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
