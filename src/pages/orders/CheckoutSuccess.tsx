import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [orderId, setOrderId] = useState<string | null>(null);
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, price, buyer_id, seller_id, requirements_submitted, status, gigs:gig_id(title), buyer:buyer_id(full_name, username, email), seller:seller_id(full_name, username, email)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!cancelled && data) {
        setOrderId(data.id);
        const buyer: any = (data as any).buyer;
        const seller: any = (data as any).seller;
        const gig: any = (data as any).gigs;
        const base = { order_id: data.id, order_number: (data as any).order_number, gig_title: gig?.title, price: (data as any).price };
        if (buyer?.email) supabase.functions.invoke("send-marketplace-email", { body: { template: "order_placed", to: buyer.email, data: { ...base, is_seller: false } } });
        if (seller?.email) supabase.functions.invoke("send-marketplace-email", { body: { template: "order_placed", to: seller.email, data: { ...base, is_seller: true, buyer_name: buyer?.full_name ?? buyer?.username } } });
        if (!data.requirements_submitted) {
          nav(`/orders/${data.id}/requirements`, { replace: true });
        } else {
          nav(`/orders/${data.id}`, { replace: true });
        }
        return;
      }
      if (++attempts < 10) setTimeout(tick, 1500);
    };
    tick();
    return () => { cancelled = true; };
  }, [user, sessionId, nav]);

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
            <Button asChild size="lg"><Link to={`/orders/${orderId}`}>Open project</Link></Button>
          ) : (
            <Button size="lg" disabled>Preparing your project…</Button>
          )}
          <Button asChild size="lg" variant="outline"><Link to="/buyer/orders">All projects</Link></Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
