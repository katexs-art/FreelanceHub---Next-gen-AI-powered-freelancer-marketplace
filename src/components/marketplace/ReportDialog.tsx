import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const REASONS = ["Spam or scam", "Inappropriate content", "Misleading", "Intellectual property", "Other"];

export function ReportDialog({
  targetType, targetId, label = "Report",
}: { targetType: "gig" | "user" | "message"; targetId: string; label?: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return nav("/login");
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id, target_type: targetType, target_id: targetId, reason, description,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted. Thanks for the heads up.");
    setOpen(false); setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground">
          <Flag className="h-3.5 w-3.5" /> {label}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report this {targetType}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground-muted">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <Textarea placeholder="Details (optional)" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={4} />
          <Button onClick={submit} disabled={busy}>Submit report</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
