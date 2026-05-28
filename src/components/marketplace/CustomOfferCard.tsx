import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FileText, Check, X } from "lucide-react";

interface Offer {
  id: string; description: string | null; price: number;
  delivery_days: number; revisions: number; status: string;
  buyer_id: string; seller_id: string; gig_id: string | null;
}

export function CustomOfferCard({ offerId }: { offerId: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("custom_offers").select("*").eq("id", offerId).maybeSingle();
    setOffer(data as any);
  };
  useEffect(() => { load(); }, [offerId]);

  if (!offer) return null;
  const isBuyer = user?.id === offer.buyer_id;
  const isPending = offer.status === "pending";

  const accept = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_custom_offer", { _offer_id: offer.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Offer accepted");
    nav(`/orders/${data}`);
  };
  const decline = async () => {
    setBusy(true);
    await supabase.from("custom_offers").update({ status: "declined" }).eq("id", offer.id);
    setBusy(false); load();
  };
  const withdraw = async () => {
    setBusy(true);
    await supabase.from("custom_offers").update({ status: "withdrawn" }).eq("id", offer.id);
    setBusy(false); load();
  };

  return (
    <div className="bg-background border border-border rounded-xl p-4 max-w-sm">
      <div className="flex items-center gap-2 text-xs text-foreground-muted">
        <FileText className="h-3.5 w-3.5" /> Custom offer · <span className="capitalize">{offer.status}</span>
      </div>
      {offer.description && <p className="text-sm mt-2 whitespace-pre-line">{offer.description}</p>}
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold">${(offer.price/100).toFixed(2)}</div>
        <div className="text-xs text-foreground-muted">
          {offer.delivery_days}d · {offer.revisions} revision{offer.revisions === 1 ? "" : "s"}
        </div>
      </div>
      {isPending && (
        <div className="mt-3 flex gap-2">
          {isBuyer ? (
            <>
              <Button size="sm" onClick={accept} disabled={busy} className="flex-1">
                <Check className="h-4 w-4" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={decline} disabled={busy}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={withdraw} disabled={busy} className="flex-1">
              Withdraw offer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
