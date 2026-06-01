import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, MicOff, Loader2, Star, AlertCircle, Keyboard, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ExpertCard {
  id: string;
  slug?: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  seller_name: string;
  seller_username: string | null;
}

const PLACEHOLDERS = [
  "Find me a voice AI expert…",
  "I need a chatbot built in 48 hours…",
  "Who can automate my Go High Level?",
  "Build me a custom AI agent…",
];

const QUICK_CATEGORIES = [
  "Voice AI",
  "Chatbot Dev",
  "AI Automation",
  "Prompt Engineering",
  "GoHighLevel",
  "AI Content",
  "AI Agents",
  "Custom AI",
];


const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/river-chat`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const stripTokens = (s: string) =>
  s.replace(/\n?\[EXPERT_CARD:\s*[0-9a-f-]{8,}\s*\]\n?/gi, "\n").replace(/\n{3,}/g, "\n\n").trim();

export function RiverCommandBar() {
  const { user } = useAuth();
  const [value, setValue] = useState("");
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState("");
  const [cards, setCards] = useState<ExpertCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState<"denied" | "no-speech" | "unsupported" | null>(null);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSendAt = useRef(0);

  // Cycle placeholders when input empty + not focused
  useEffect(() => {
    if (focused || value) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % PLACEHOLDERS.length;
      setPlaceholder(PLACEHOLDERS[i]);
    }, 3000);
    return () => clearInterval(t);
  }, [focused, value]);

  // Keep submit reachable from speech-recognition callbacks without stale closures
  const submitRef = useRef<(text: string) => void>(() => {});

  // Voice input — Web Speech API. Streams interim text into the input,
  // then auto-submits the final transcript to River.
  const toggleMic = useCallback(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMicError("unsupported");
      setError("Voice input isn't supported in this browser. Try Chrome, Edge, or Safari.");
      toast.error("Voice input unavailable", {
        description: "Your browser doesn't support speech recognition. Try Chrome, Edge, or Safari.",
      });
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      return;
    }

    setError(null);
    setMicError(null);
    let finalText = "";

    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += txt;
        else interim += txt;
      }
      setValue((finalText + interim).trim());
    };
    r.onerror = (e: any) => {
      setListening(false);
      const code = e?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setMicError("denied");
        setError("Microphone access is blocked. Enable it in your browser settings to use voice search.");
        toast.error("Microphone blocked", {
          description: "Permission denied. Enable microphone access in your browser settings.",
        });
      } else if (code === "no-speech") {
        setMicError("no-speech");
        setError("Didn't catch that. Try speaking closer to the microphone, or type your request below.");
        toast.info("No speech detected", { description: "Try again or type your request." });
      } else if (code && code !== "aborted") {
        setError("Voice input failed. Please try again.");
        toast.error("Voice input failed", { description: "Something went wrong. Please try again." });
      }
    };
    r.onend = () => {
      setListening(false);
      const out = finalText.trim();
      if (out.length >= 3) {
        setValue(out);
        submitRef.current(out);
      }
    };

    recogRef.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  }, [listening]);

  useEffect(() => () => { recogRef.current?.stop?.(); abortRef.current?.abort(); }, []);


  const submit = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || loading) return;
    const now = Date.now();
    if (now - lastSendAt.current < 500) return;
    lastSendAt.current = now;

    setError(null);
    setStream("");
    setCards([]);

    if (!user) {
      setError("Please sign in to ask River.");
      return;
    }

    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timeout = setTimeout(() => ctrl.abort("timeout"), 15_000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) { setError("Please sign in to ask River."); return; }

      const resp = await fetch(FN_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": ANON_KEY,
        },
        body: JSON.stringify({ message: trimmed, history: [] }),
      });

      if (resp.status === 401) { setError("Please sign in to ask River."); return; }
      if (resp.status === 429) { setError("You're going too fast — please wait a moment."); return; }
      if (!resp.ok || !resp.body) { setError("River is taking a quick break. Try again in a moment."); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let finalCards: ExpertCard[] = [];

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buf += decoder.decode(chunk, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (typeof evt.delta === "string") {
              acc += evt.delta;
              setStream(stripTokens(acc));
            } else if (evt.done && Array.isArray(evt.cards)) {
              finalCards = evt.cards;
            }
          } catch { /* ignore */ }
        }
      }
      setStream(stripTokens(acc));
      setCards(finalCards);
    } catch (e: any) {
      if (e?.name === "AbortError" || ctrl.signal.aborted) {
        setError("River is taking too long. Please try again.");
      } else {
        setError("Connection lost. Check your internet and try again.");
      }
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      setLoading(false);
    }
  }, [loading, user]);

  // Keep ref pointing to the latest submit so voice callbacks always call the current one.
  useEffect(() => { submitRef.current = submit; }, [submit]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); submit(value); };


  const onChipClick = (label: string) => {
    const text = `Find me a top ${label} expert`;
    setValue(text);
    submit(text);
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", width: "100%" }}>
      <style>{`
        @keyframes riverGlow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(22,163,74,0.55), 0 0 30px rgba(22,163,74,0.3), 0 0 60px rgba(22,163,74,0.12); }
          50% { box-shadow: 0 0 0 1px rgba(22,163,74,0.9), 0 0 45px rgba(22,163,74,0.5), 0 0 80px rgba(22,163,74,0.2); }
        }
        @keyframes riverPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes riverRingPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.55); }
          70% { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
        }
        @keyframes riverFadeIn {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .river-bar { transition: border-color .25s ease, box-shadow .3s ease, background .25s ease; }
        .river-bar--focused { animation: riverGlow 2.6s ease-in-out infinite; border-color: rgba(22,163,74,0.7) !important; }
        .river-r-logo { animation: riverRingPulse 2.2s ease-out infinite; }
        .river-ask-btn { transition: transform .2s ease, background .2s ease, box-shadow .2s ease; }
        .river-ask-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(22,163,74,0.35); }
        .river-chip { transition: background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease; }
        .river-chip:hover { background: rgba(22,163,74,0.1) !important; border-color: rgba(22,163,74,0.6) !important; color: #fff !important; transform: translateY(-1px); }
        .river-mic--on { animation: riverPulse 1.2s ease-in-out infinite; color: #ef4444 !important; }
        .river-card-in { animation: riverFadeIn .45s ease-out both; }
      `}</style>

      <div style={{ position: "absolute", marginTop: -28, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "#16A34A", animation: "riverPulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 600 }}>
          Powered by River AI
        </span>
      </div>

      <form onSubmit={onSubmit}>
        <div
          className={`river-bar ${focused ? "river-bar--focused" : ""}`}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#0a0a0a",
            border: "1px solid #1f1f1f",
            borderRadius: 999,
            padding: "6px 8px 6px 8px",
          }}
        >
          {/* Left: River R logo with green pulse */}
          <div
            className="river-r-logo"
            aria-hidden="true"
            style={{
              height: 40, width: 40, borderRadius: 999,
              background: "#0a0a0a", border: "1px solid #1f1f1f",
              color: "#fff", display: "grid", placeItems: "center",
              fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800, fontSize: 16,
              position: "relative", flexShrink: 0,
            }}
          >
            R
            <span style={{
              position: "absolute", top: 2, right: 2, height: 8, width: 8, borderRadius: 999,
              background: "#16A34A", boxShadow: "0 0 0 2px #0a0a0a",
              animation: "riverPulse 1.6s ease-in-out infinite",
            }} />
          </div>

          <input
            value={value}
            onChange={(e) => { setValue(e.target.value); if (micError) { setMicError(null); setError(null); } }}
            onFocus={() => { setFocused(true); if (micError) { setMicError(null); setError(null); } }}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fff", fontSize: 15, padding: "14px 6px",
            }}
          />

          {/* Right: mic icon */}
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            className={listening ? "river-mic--on" : ""}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "#888", padding: 8, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Right: Ask River button */}
          <button
            type="submit"
            disabled={loading || value.trim().length < 3}
            className="river-ask-btn"
            style={{
              height: 44, borderRadius: 999, padding: "0 18px",
              background: loading || value.trim().length < 3 ? "#1f1f1f" : "#16A34A",
              color: "#fff", border: "none",
              cursor: loading || value.trim().length < 3 ? "default" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 13, fontWeight: 700, letterSpacing: "0.01em",
              flexShrink: 0,
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : (
              <>Ask River <span aria-hidden="true">→</span></>
            )}
          </button>
        </div>
      </form>


      {/* Quick category chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
        {QUICK_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChipClick(c)}
            className="river-chip"
            style={{
              padding: "8px 14px", borderRadius: 999,
              border: "1px solid #1f1f1f", background: "rgba(255,255,255,0.02)",
              color: "#bbb", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Results */}
      {(loading || stream || cards.length > 0 || error) && (
        <div style={{ marginTop: 28, textAlign: "left" }}>
          {error && (
            <div style={{ background: micError ? "rgba(234,179,8,0.06)" : "rgba(239,68,68,0.08)", border: `1px solid ${micError ? "rgba(234,179,8,0.35)" : "rgba(239,68,68,0.3)"}`, borderRadius: 14, padding: "14px 16px", color: micError ? "#fde047" : "#fca5a5", fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <AlertCircle size={18} style={{ marginTop: 2, flexShrink: 0, color: micError ? "#facc15" : "#fca5a5" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: micError ? 8 : 0 }}>{error}</div>
                  {micError === "denied" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <button type="button" onClick={toggleMic} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.4)", borderRadius: 999, padding: "6px 12px", color: "#fde047", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        <RefreshCw size={12} /> Retry mic
                      </button>
                      <span style={{ color: "#a3a3a3", fontSize: 12 }}>or type your request above</span>
                    </div>
                  )}
                  {micError === "no-speech" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <button type="button" onClick={toggleMic} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.4)", borderRadius: 999, padding: "6px 12px", color: "#fde047", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        <RefreshCw size={12} /> Try again
                      </button>
                      <span style={{ color: "#a3a3a3", fontSize: 12 }}>or type your request above</span>
                    </div>
                  )}
                  {micError === "unsupported" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#a3a3a3", fontSize: 12 }}>Switch to Chrome, Edge, or Safari, or type your request above</span>
                      <Keyboard size={14} style={{ color: "#a3a3a3" }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(stream || (loading && !error)) && (
            <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 16, padding: 18, color: "#e5e5e5", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ height: 22, width: 22, borderRadius: 999, background: "#16A34A", color: "#fff", display: "grid", placeItems: "center", fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800, fontSize: 11 }}>R</span>
                <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 600 }}>River</span>
              </div>
              {stream || (
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <span style={{ height: 6, width: 6, borderRadius: 999, background: "#16A34A", animation: "riverPulse 1s ease-in-out infinite" }} />
                  <span style={{ height: 6, width: 6, borderRadius: 999, background: "#16A34A", animation: "riverPulse 1s ease-in-out infinite .15s" }} />
                  <span style={{ height: 6, width: 6, borderRadius: 999, background: "#16A34A", animation: "riverPulse 1s ease-in-out infinite .3s" }} />
                </span>
              )}
            </div>
          )}

          {cards.length > 0 && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {cards.map((c, i) => (
                <Link
                  key={c.id}
                  to={`/gig/${c.slug || c.id}`}
                  className="river-card-in"
                  style={{
                    display: "block", textDecoration: "none",
                    background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 14, padding: 16,
                    color: "#fff", transition: "border-color .2s ease, transform .2s ease",
                    animationDelay: `${i * 90}ms`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(22,163,74,0.5)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>by {c.seller_name}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {c.reviews > 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#ccc" }}>
                        <Star size={12} className="fill-current" style={{ color: "#fbbf24" }} />
                        <span style={{ fontWeight: 600, color: "#fff" }}>{c.rating.toFixed(1)}</span>
                        <span style={{ color: "#888" }}>({c.reviews})</span>
                      </span>
                    ) : <span style={{ fontSize: 11, color: "#888" }}>New</span>}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>${c.price}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
