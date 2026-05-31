import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

export function PromoteGigDialog({ gigId, onPromoted }: { gigId: string; onPromoted?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState(5);
  const [busy, setBusy] = useState(false);

  const total = days * budget;

  const promote = async () => {
    if (!user) return;
    setBusy(true);
    const ends = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await supabase.from("gig_promotions").insert({
      gig_id: gigId, seller_id: user.id, daily_budget_cents: budget * 100,
      ends_at: ends, status: "active",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Play is now promoted");
    setOpen(false); onPromoted?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          <Megaphone className="h-3.5 w-3.5" /> Promote
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Promote your play</DialogTitle></DialogHeader>
        <p className="text-sm text-foreground-muted">Boost your play to the top of Search & Explore.</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="text-xs font-medium text-foreground-muted">Duration (days)</label>
            <Input type="number" min={1} max={60} value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value || "1", 10)))} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-muted">Daily budget ($)</label>
            <Input type="number" min={1} value={budget}
              onChange={(e) => setBudget(Math.max(1, parseInt(e.target.value || "1", 10)))} />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Total budget</span>
          <span className="font-bold">${total}</span>
        </div>
        <Button onClick={promote} disabled={busy}>Start promotion</Button>
      </DialogContent>
    </Dialog>
  );
}
