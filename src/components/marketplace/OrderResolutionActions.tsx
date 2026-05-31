import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { XCircle, AlertTriangle, Check, X } from "lucide-react";

interface CancReq {
  id: string;
  status: string;
  reason: string | null;
  requested_by: string;
}

export function OrderResolutionActions({
  orderId, onChange,
}: { orderId: string; onChange?: () => void }) {
  const { user } = useAuth();
  const [canc, setCanc] = useState<CancReq | null>(null);
  const [hasDisp, setHasDisp] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: d }] = await Promise.all([
      supabase.from("cancellation_requests").select("id, status, reason, requested_by").eq("order_id", orderId).maybeSingle(),
      supabase.from("disputes").select("id, status").eq("order_id", orderId).maybeSingle(),
    ]);
    setCanc(c as any);
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

  const respondCancel = async (accept: boolean) => {
    if (!user || !canc) return;
    setBusy(true);
    const { error } = await supabase.from("cancellation_requests")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", canc.id);
    if (error) { setBusy(false); return toast.error(error.message); }

    if (accept) {
      const { data, error: refundErr } = await supabase.functions.invoke("stripe-refund", { body: { order_id: orderId } });
      setBusy(false);
      if (refundErr || data?.error) {
        toast.error(refundErr?.message || data?.error || "Refund failed — contact support");
      } else {
        toast.success("Project cancelled — refund sent to partner");
      }
    } else {
      setBusy(false);
      toast.success("Cancellation declined");
    }
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

  const pendingCanc = canc?.status === "pending";
  const isCounterparty = pendingCanc && canc.requested_by !== user?.id;

  return (
    <div className="space-y-2">
      {isCounterparty && (
        <div className="rounded-lg border border-border bg-background-elevated p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Cancellation requested</div>
              {canc?.reason && <div className="text-foreground-muted mt-0.5">{canc.reason}</div>}
              <div className="text-xs text-foreground-muted mt-1">Accepting will refund the partner automatically.</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => respondCancel(true)} disabled={busy}>
                <Check className="h-4 w-4" /> Accept & refund
              </Button>
              <Button size="sm" variant="ghost" onClick={() => respondCancel(false)} disabled={busy}>
                <X className="h-4 w-4" /> Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={pendingCanc}>
              <XCircle className="h-4 w-4" /> {pendingCanc ? "Cancel pending" : "Request cancellation"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request cancellation</DialogTitle></DialogHeader>
            <p className="text-sm text-foreground-muted">If the other party accepts, the partner is refunded automatically.</p>
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
            <p className="text-sm text-foreground-muted">Our team will review the project and mediate.</p>
            <Textarea placeholder="What happened?" value={reason} onChange={(e) => setReason(e.target.value)} rows={5} />
            <Button onClick={openDispute} disabled={busy || !reason.trim()}>Submit dispute</Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
