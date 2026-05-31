import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
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
  const [price, setPrice] = useState<string>("");
  const [days, setDays] = useState<string>("");
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

  const priceNum = Number(price);
  const daysNum = Number(days);
  const canSend =
    pitch.trim().length >= 80 &&
    Number.isFinite(priceNum) && priceNum > 0 &&
    Number.isFinite(daysNum) && daysNum > 0 &&
    !sending;

  const send = async () => {
    if (!canSend || !search) return;
    setSending(true);
    const { data: convId, error } = await supabase.rpc("submit_river_pitch", {
      _search_id: search.id,
      _content: pitch.trim(),
      _price: Math.round(priceNum * 100),
      _delivery_days: Math.round(daysNum),
    });
    if (error || !convId) {
      toast({ title: "Could not send pitch", description: error?.message });
      setSending(false); return;
    }

    try {
      const { data: buyer } = await supabase.from("profiles")
        .select("email,full_name").eq("id", search.buyer_id).maybeSingle();
      if (buyer?.email) {
        await supabase.functions.invoke("send-marketplace-email", {
          body: {
            template: "new_message",
            to: buyer.email,
            subject: "Someone pitched your project on Katexs",
            data: {
              conversation_id: convId,
              preview: "A qualified expert responded to your request. Log in to review their pitch and get your project started.",
            },
          },
        });
      }
    } catch { /* best effort */ }

    toast({ title: "Pitch sent", description: "The partner has been notified." });
    nav(`/inbox/${convId}`);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 44, padding: "0 12px",
    border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 14,
    background: "#fff", color: "#111", outline: "none",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 container-page py-12 max-w-2xl">
        {loading ? (
          <p className="text-foreground-muted">Loading…</p>
        ) : !search ? (
          <p className="text-foreground-muted">This request is no longer available.</p>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Send Your Pitch</h1>

            <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 600 }}>
                What the buyer needs:
              </div>
              <div style={{ fontSize: 14, color: "#111", lineHeight: 1.5 }}>{search.query}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 6 }}>
                Your pitch message
              </label>
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Tell this partner exactly why you are the best person for this job. Describe your approach, what you will deliver, and why they should choose you over everyone else."
                style={{
                  width: "100%", minHeight: 200, padding: 12,
                  border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 14,
                  background: "#fff", color: "#111", outline: "none", resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ fontSize: 12, color: pitch.trim().length >= 80 ? "#666" : "#c00", marginTop: 4 }}>
                {pitch.trim().length}/80 minimum
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 6 }}>
                Your price for this project
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 14 }}>$</span>
                <input
                  type="number" min={1} step={1}
                  value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter your price"
                  style={{ ...inputStyle, paddingLeft: 24 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 6 }}>
                Your delivery time
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number" min={1} step={1}
                  value={days} onChange={(e) => setDays(e.target.value)}
                  placeholder="How many days to complete"
                  style={{ ...inputStyle, paddingRight: 52 }}
                />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 14 }}>days</span>
              </div>
            </div>

            <button
              onClick={send}
              disabled={!canSend}
              style={{
                width: "100%", height: 48, borderRadius: 999,
                background: "#000", color: "#fff", border: "none",
                fontSize: 15, fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed",
                opacity: canSend ? 1 : 0.5,
              }}
            >
              {sending ? "Sending…" : "Send My Pitch"}
            </button>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
