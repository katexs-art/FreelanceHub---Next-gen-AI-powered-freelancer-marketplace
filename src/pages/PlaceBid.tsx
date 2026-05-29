import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export default function PlaceBid() {
  const { project_id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("");
  const [cover, setCover] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!project_id) return;
    (async () => {
      const { data } = await supabase.from("project_posts").select("*").eq("id", project_id).maybeSingle();
      setProject(data);
    })();
  }, [project_id]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setAttachments([...attachments, ...urls]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !project_id) return;
    if (!amount || !days || !cover.trim()) {
      toast({ title: "Please fill in amount, delivery time and cover message" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("submit_bid", {
      _project_id: project_id,
      _bid_amount: parseInt(amount, 10),
      _delivery_days: parseInt(days, 10),
      _cover_message: cover.trim(),
      _attachments: attachments,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not submit bid", description: error.message, variant: "destructive" });
      return;
    }
    // Best-effort email
    if (project?.buyer_id) {
      supabase.functions.invoke("send-marketplace-email", {
        body: {
          to_user_id: project.buyer_id,
          subject: "A new bid came in on your project",
          body: "A new bid came in on your project — review it now.",
        },
      }).catch(() => {});
    }
    toast({ title: "Your bid was submitted successfully" });
    nav("/projects");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10 max-w-3xl mx-auto w-full">
        {project ? (
          <>
            <div className="mb-8 surface rounded-lg p-6 border border-white/10">
              <h1 className="text-xl font-semibold mb-2">{project.title}</h1>
              <p className="text-sm text-foreground-muted whitespace-pre-wrap mb-3">{project.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-foreground-muted">
                {project.category && <span className="px-2 py-0.5 rounded-full border border-white/15">{project.category}</span>}
                <span>${project.budget_min ?? "?"} – ${project.budget_max ?? "?"}</span>
                {project.deadline && <span>Due {new Date(project.deadline).toLocaleDateString()}</span>}
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4">Place your bid</h2>
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-sm mb-2">Your bid amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">$</span>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7" />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Your delivery time</label>
                <div className="relative">
                  <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} className="pr-14" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">days</span>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Cover message</label>
                <Textarea
                  value={cover}
                  onChange={(e) => setCover(e.target.value)}
                  style={{ minHeight: 140 }}
                  placeholder="Introduce yourself and explain exactly why you are the best person for this job. Be specific about your approach and what you will deliver."
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Attachments</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="text-sm"
                />
                {attachments.length > 0 && (
                  <div className="text-xs text-foreground-muted mt-2">{attachments.length} file(s) attached</div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 bg-foreground text-background font-mono uppercase tracking-[0.12em] text-[13px] disabled:opacity-50"
                style={{ borderRadius: 999 }}
              >
                {saving ? "Submitting…" : "Submit My Bid"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-sm text-foreground-muted">Loading project…</div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
