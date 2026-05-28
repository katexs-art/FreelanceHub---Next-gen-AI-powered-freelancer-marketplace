import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BadgeCheck, Clock, X } from "lucide-react";

interface Verif {
  status: "unverified" | "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  submitted_at: string | null;
}

export default function Verification() {
  const { user } = useAuth();
  const [verif, setVerif] = useState<Verif | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("seller_verifications")
      .select("status, rejection_reason, submitted_at").eq("seller_id", user.id).maybeSingle();
    setVerif((data as Verif) ?? { status: "unverified", rejection_reason: null, submitted_at: null });
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const submit = async () => {
    if (!user || !idDoc || !selfie) return;
    setBusy(true);
    try {
      const upload = async (file: File, kind: string) => {
        const path = `${user.id}/${kind}-${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
        if (error) throw error;
        return path;
      };
      const id_document_url = await upload(idDoc, "id");
      const selfie_url = await upload(selfie, "selfie");
      const payload = {
        seller_id: user.id, id_document_url, selfie_url,
        status: "pending", submitted_at: new Date().toISOString(), rejection_reason: null,
      };
      const { error } = await supabase.from("seller_verifications").upsert(payload, { onConflict: "seller_id" });
      if (error) throw error;
      toast.success("Verification submitted — we'll review shortly");
      setIdDoc(null); setSelfie(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const status = verif?.status ?? "unverified";

  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Verification</h1>
        <p className="text-sm text-foreground-muted mt-1">Get a Verified badge so buyers trust you faster.</p>

        <div className="mt-6 bg-background border border-border rounded-xl p-6 space-y-5">
          <StatusBanner status={status} reason={verif?.rejection_reason ?? null} />

          {status !== "verified" && status !== "pending" && (
            <>
              <div>
                <label className="text-sm font-medium">Government ID</label>
                <p className="text-xs text-foreground-muted mb-1.5">Passport, driver's license, or national ID.</p>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <label className="text-sm font-medium">Selfie</label>
                <p className="text-xs text-foreground-muted mb-1.5">A clear photo of your face, holding your ID.</p>
                <Input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={submit} disabled={busy || !idDoc || !selfie}>Submit for review</Button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusBanner({ status, reason }: { status: string; reason: string | null }) {
  if (status === "verified") return (
    <div className="flex items-start gap-3 text-success">
      <BadgeCheck className="h-5 w-5 mt-0.5" />
      <div><div className="font-medium">You're verified</div>
        <div className="text-xs text-foreground-muted">Your profile shows a Verified badge.</div></div>
    </div>
  );
  if (status === "pending") return (
    <div className="flex items-start gap-3 text-warning">
      <Clock className="h-5 w-5 mt-0.5" />
      <div><div className="font-medium">Review pending</div>
        <div className="text-xs text-foreground-muted">We typically respond within 1–2 business days.</div></div>
    </div>
  );
  if (status === "rejected") return (
    <div className="flex items-start gap-3 text-destructive">
      <X className="h-5 w-5 mt-0.5" />
      <div><div className="font-medium">Verification rejected</div>
        <div className="text-xs text-foreground-muted">{reason ?? "Please re-submit with clearer documents."}</div></div>
    </div>
  );
  return <p className="text-sm text-foreground-muted">Upload your ID and a selfie to start verification.</p>;
}
