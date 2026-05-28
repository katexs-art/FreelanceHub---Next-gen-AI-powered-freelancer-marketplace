import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { XCircle, AlertTriangle } from "lucide-react";

export function OrderResolutionActions({
  orderId, onChange,
}: { orderId: string; onChange?: () => void }) {
  const { user } = useAuth();
  const [hasCanc, setHasCanc] = useState(false);
  const [hasDisp, setHasDisp] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: d }] = await Promise.all([
      supabase.from("cancellation_requests").select("id, status").eq("order_id", orderId).maybeSingle(),
      supabase.from("disputes").select("id, status").eq("order_id", orderId).maybeSingle(),
    ]);
    setHasCanc(!!c && (c as any).status === "pending");
    setHasDisp(!!d && (d as any).status === "open");
  };
  useEffect(() => { load(); }, [orderId]);

  const requestCancel = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("cancellation_requests").insert({
      order_id: orderId, requested_by: user.id, reason,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setCancelOpen(false); setReason(""); toast.success("Cancellation requested");
    load(); onChange?.();
  };

  const openDispute = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("disputes").insert({
      order_id: orderId, raised_by: user.id, description: reason, reason: reason.slice(0, 80),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDisputeOpen(false); setReason(""); toast.success("Dispute opened");
    load(); onChange?.();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={hasCanc}>
            <XCircle className="h-4 w-4" /> {hasCanc ? "Cancel pending" : "Request cancellation"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Request cancellation</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground-muted">The other party will be notified and must accept.</p>
          <Textarea placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          <Button onClick={requestCancel} disabled={busy || !reason.trim()}>Send request</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={hasDisp}>
            <AlertTriangle className="h-4 w-4" /> {hasDisp ? "Dispute open" : "Open dispute"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Open a dispute</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground-muted">Our team will review the order and mediate.</p>
          <Textarea placeholder="What happened?" value={reason} onChange={(e) => setReason(e.target.value)} rows={5} />
          <Button onClick={openDispute} disabled={busy || !reason.trim()}>Submit dispute</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
