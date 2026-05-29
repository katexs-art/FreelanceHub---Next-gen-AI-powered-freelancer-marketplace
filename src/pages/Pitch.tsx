import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export default function Pitch() {
  const { buyer_search_id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [search, setSearch] = useState<{ id: string; query: string; buyer_id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pitch, setPitch] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    if (!buyer_search_id) return;
    (async () => {
      const { data } = await supabase.from("buyer_searches")
        .select("id,query,buyer_id").eq("id", buyer_search_id).maybeSingle();
      setSearch(data as any);
      setLoading(false);
    })();
  }, [buyer_search_id, user]);

  const send = async () => {
    if (!pitch.trim() || !search) return;
    setSending(true);
    const { data: convId, error } = await supabase.rpc("submit_river_pitch", {
      _search_id: search.id, _content: pitch.trim(),
    });
    if (error || !convId) {
      toast({ title: "Could not send pitch", description: error?.message });
      setSending(false); return;
    }

    // Best-effort email notification to buyer
    try {
      const { data: buyer } = await supabase.from("profiles")
        .select("email,full_name").eq("id", search.buyer_id).maybeSingle();
      const { data: me } = await supabase.from("profiles")
        .select("full_name,username").eq("id", user!.id).maybeSingle();
      if (buyer?.email) {
        await supabase.functions.invoke("send-marketplace-email", {
          body: {
            template: "new_message",
            to: buyer.email,
            data: {
              sender_name: (me as any)?.full_name || (me as any)?.username || "An expert",
              conversation_id: convId,
              preview: "A top expert responded to your request — read their pitch now.",
            },
          },
        });
      }
    } catch { /* email is best-effort */ }

    toast({ title: "Pitch sent", description: "The buyer has been notified." });
    nav(`/inbox/${convId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container-page py-12 max-w-3xl">
        <div className="eyebrow mb-3">RIVER MATCH</div>
        <h1 className="display-md mb-6">Pitch this buyer</h1>

        {loading ? (
          <p className="text-foreground-muted">Loading…</p>
        ) : !search ? (
          <p className="text-foreground-muted">This request is no longer available.</p>
        ) : (
          <>
            <div className="surface rounded-lg p-5 mb-6">
              <div className="eyebrow mb-2">BUYER'S REQUEST</div>
              <p className="text-base">"{search.query}"</p>
            </div>

            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Tell this buyer why you are the best person for this job, what you will deliver, your price, and your timeline."
              rows={10}
              className="w-full surface rounded-lg p-4 text-sm focus:outline-none focus:border-white/30 resize-y"
            />

            <div className="mt-4 flex justify-end">
              <Button
                onClick={send}
                disabled={sending || !pitch.trim()}
                className="bg-black text-white hover:bg-black/90 rounded-full px-6"
              >
                {sending ? "Sending…" : "Send My Pitch"}
              </Button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
