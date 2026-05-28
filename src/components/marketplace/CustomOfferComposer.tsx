import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText } from "lucide-react";

export function CustomOfferComposer({
  conversationId, sellerId, buyerId, onSent,
}: { conversationId: string; sellerId: string; buyerId: string; onSent?: () => void }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("3");
  const [revs, setRevs] = useState("1");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const p = Math.round(Number(price) * 100);
    if (!p || p < 500) return toast.error("Minimum offer is $5");
    setBusy(true);
    const { data: offer, error } = await supabase.from("custom_offers").insert({
      conversation_id: conversationId, seller_id: sellerId, buyer_id: buyerId,
      description: desc, price: p, delivery_days: Number(days) || 1, revisions: Number(revs) || 0,
    }).select("id").single();
    if (error) { setBusy(false); return toast.error(error.message); }
    await supabase.from("messages").insert({
      conversation_id: conversationId, sender_id: sellerId, recipient_id: buyerId,
      content: `📩 Custom offer: $${(p/100).toFixed(2)} · ${days}d delivery`,
      custom_offer_id: offer.id,
    });
    setBusy(false); setOpen(false); setDesc(""); setPrice("");
    toast.success("Offer sent");
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <FileText className="h-4 w-4" /> Send offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Send a custom offer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Textarea placeholder="What's included?" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-foreground-muted">Price (USD)</label>
              <Input type="number" min="5" step="1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-foreground-muted">Delivery (days)</label>
              <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-foreground-muted">Revisions</label>
              <Input type="number" min="0" value={revs} onChange={(e) => setRevs(e.target.value)} />
            </div>
          </div>
          <Button onClick={send} disabled={busy} className="w-full">Send offer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
