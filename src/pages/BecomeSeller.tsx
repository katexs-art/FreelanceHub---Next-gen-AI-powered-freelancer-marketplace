import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const STEPS = [
  { num: "01", title: "Create your seller account", desc: "Pick a username and tell us about you." },
  { num: "02", title: "Publish your first gig", desc: "Describe a service with clear pricing tiers." },
  { num: "03", title: "Get discovered", desc: "Buyers find you through search and category browsing." },
  { num: "04", title: "Deliver and earn", desc: "Payments held in escrow, released when buyers approve." },
];

export default function BecomeSeller() {
  const { user, profile, refresh } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isAlreadySeller = profile?.role === "seller" || profile?.role === "admin";

  const becomeSeller = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ role: "seller" }).eq("id", user.id);
    if (!error) {
      // make sure seller_accounts row exists
      await supabase.from("seller_accounts").upsert({ seller_id: user.id }, { onConflict: "seller_id" });
      toast.success("Welcome aboard! You're now a seller.");
      await refresh();
      navigate("/seller/dashboard");
    } else toast.error(error.message);
    setLoading(false);
  };


  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="bg-primary text-primary-foreground">
        <div className="container py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Sell your services to the world.</h1>
            <p className="mt-4 text-lg opacity-90 max-w-md">
              Turn your skills into income. Reach thousands of buyers with zero upfront cost.
            </p>
            <div className="mt-8 flex gap-3">
              {!user ? (
                <Link to="/signup"><Button size="lg" variant="secondary">Become a seller</Button></Link>
              ) : isAlreadySeller ? (
                <Link to="/seller/dashboard"><Button size="lg" variant="secondary">Go to seller dashboard</Button></Link>

              ) : (
                <Button size="lg" variant="secondary" onClick={becomeSeller} disabled={loading}>
                  {loading ? "Setting up…" : "Activate seller mode"}
                </Button>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="aspect-square rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20" />
          </div>
        </div>
      </section>

      <section className="container py-20">
        <h2 className="text-3xl font-bold mb-10">How it works</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="p-6 rounded-xl border border-border bg-background">
              <div className="font-mono text-primary text-xs mb-3">{s.num}</div>
              <div className="font-semibold mb-2">{s.title}</div>
              <p className="text-sm text-foreground-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
