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

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/river-chat`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const stripTokens = (s: string) =>
  s.replace(/\n?\[EXPERT_CARD:\s*[0-9a-f-]{8,}\s*\]\n?/gi, "\n").replace(/\n{3,}/g, "\n\n").trim();

export function RiverCommandBar() {
  const { user } = useAuth();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<ExpertCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [micError, setMicError] = useState<"denied" | "no-speech" | "unsupported" | null>(null);
  const [listening, setListening] = useState(false);
  const [retryingMic, setRetryingMic] = useState(false);
  const recogRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSendAt = useRef(0);
  const submitRef = useRef<(text: string) => void>(() => {});

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
    if (listening) { recogRef.current?.stop(); return; }

    setError(null); setMicError(null);
    let finalText = "";
    const r = new SR();
    r.lang = "en-US"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += txt; else interim += txt;
      }
      setValue((finalText + interim).trim());
    };
    r.onerror = (e: any) => {
      setListening(false);
      const code = e?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setMicError("denied");
        setError("Microphone access is blocked. Enable it in your browser settings to use voice search.");
        toast.error("Microphone blocked", { description: "Permission denied. Enable microphone access in your browser settings." });
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
      if (out.length >= 3) { setValue(out); submitRef.current(out); }
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

    setError(null); setStream(""); setCards([]);
    if (!user) { setError("Please sign in to ask River."); return; }

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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}`, "apikey": ANON_KEY },
        body: JSON.stringify({ message: trimmed, history: [] }),
      });

      if (resp.status === 401) { setError("Please sign in to ask River."); return; }
      if (resp.status === 429) { setError("You're going too fast — please wait a moment."); return; }
      if (!resp.ok || !resp.body) { setError("River is taking a quick break. Try again in a moment."); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let acc = ""; let finalCards: ExpertCard[] = [];
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buf += decoder.decode(chunk, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (typeof evt.delta === "string") { acc += evt.delta; setStream(stripTokens(acc)); }
            else if (evt.done && Array.isArray(evt.cards)) finalCards = evt.cards;
          } catch { /* ignore */ }
        }
      }
      setStream(stripTokens(acc));
      setCards(finalCards);
    } catch (e: any) {
      if (e?.name === "AbortError" || ctrl.signal.aborted) setError("River is taking too long. Please try again.");
      else setError("Connection lost. Check your internet and try again.");
    } finally {
      clearTimeout(timeout); abortRef.current = null; setLoading(false);
    }
  }, [loading, user]);

  useEffect(() => { submitRef.current = submit; }, [submit]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); submit(value); };

  const retryMic = useCallback(async () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setRetryingMic(true); setMicError(null); setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setRetryingMic(false);
      recogRef.current?.stop?.();
      toggleMic();
    } catch {
      setRetryingMic(false);
      setMicError("denied");
      setError("Microphone access is still blocked. Enable it in your browser settings to use voice search.");
      toast.error("Microphone still blocked", { description: "Permission was denied again. Enable microphone access in your browser settings." });
    }
  }, [toggleMic]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <style>{`
        @keyframes riverPulseDot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.85; } }
        @keyframes riverRingPulse {
          0% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.55); }
          70% { box-shadow: 0 0 0 10px hsl(var(--primary) / 0); }
          100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
        }
        .river-r-badge { animation: riverRingPulse 2.2s ease-out infinite; }
        .river-mic--on { color: hsl(0 84% 60%) !important; animation: riverPulseDot 1.2s ease-in-out infinite; }
      `}</style>

      <form onSubmit={onSubmit}>
        <div className="flex items-center gap-2 bg-background border border-border rounded-full pl-2 pr-2 h-14 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)] transition-all focus-within:border-primary focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]">
          {/* River R logo */}
          <div
            className="river-r-badge flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-base"
            aria-hidden="true"
          >
            R
          </div>

          <input
            value={value}
            onChange={(e) => { setValue(e.target.value); if (micError) { setMicError(null); setError(null); } }}
            onFocus={() => { if (micError) { setMicError(null); setError(null); } }}
            placeholder="Describe what you need — River finds your perfect expert..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-foreground-muted text-[15px] px-2"
          />

          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            className={`flex-shrink-0 p-2 rounded-full text-foreground-muted hover:text-foreground hover:bg-muted transition-colors ${listening ? "river-mic--on" : ""}`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            type="submit"
            disabled={loading || value.trim().length < 3}
            className="flex-shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : (<>Ask River <span aria-hidden="true">→</span></>)}
          </button>
        </div>
      </form>

      {/* Results / errors */}
      {(loading || stream || cards.length > 0 || error) && (
        <div className="mt-6 text-left">
          {error && (
            <div className={`rounded-xl px-4 py-3.5 text-sm border ${micError ? "bg-yellow-50 border-yellow-200 text-yellow-900" : "bg-red-50 border-red-200 text-red-900"}`}>
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className={`font-semibold ${micError ? "mb-2" : ""}`}>{error}</div>
                  {micError === "denied" && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <button type="button" onClick={retryMic} disabled={retryingMic}
                        className="inline-flex items-center gap-1.5 bg-yellow-100 border border-yellow-300 rounded-full px-3 py-1.5 text-xs font-semibold text-yellow-900 disabled:opacity-60">
                        {retryingMic ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        {retryingMic ? "Retrying…" : "Retry mic"}
                      </button>
                      <span className="text-xs text-foreground-muted">or type your request above</span>
                    </div>
                  )}
                  {micError === "no-speech" && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <button type="button" onClick={toggleMic}
                        className="inline-flex items-center gap-1.5 bg-yellow-100 border border-yellow-300 rounded-full px-3 py-1.5 text-xs font-semibold text-yellow-900">
                        <RefreshCw size={12} /> Try again
                      </button>
                      <span className="text-xs text-foreground-muted">or type your request above</span>
                    </div>
                  )}
                  {micError === "unsupported" && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-foreground-muted">Switch to Chrome, Edge, or Safari, or type your request above</span>
                      <Keyboard size={14} className="text-foreground-muted" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(stream || (loading && !error)) && (
            <div className="mt-3 bg-background border border-border rounded-2xl p-5 text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-[10px]">R</span>
                <span className="text-[11px] tracking-[0.18em] uppercase text-foreground-muted font-semibold">River</span>
              </div>
              {stream || (
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:.3s]" />
                </span>
              )}
            </div>
          )}

          {cards.length > 0 && (
            <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {cards.map((c) => (
                <Link key={c.id} to={`/gig/${c.slug || c.id}`}
                  className="block bg-background border border-border rounded-2xl p-4 text-foreground hover:border-primary/50 hover:-translate-y-0.5 transition-all">
                  <div className="text-sm font-semibold mb-1 line-clamp-2">{c.title}</div>
                  <div className="text-xs text-foreground-muted mb-2.5">by {c.seller_name}</div>
                  <div className="flex items-center justify-between">
                    {c.reviews > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{c.rating.toFixed(1)}</span>
                        <span className="text-foreground-muted">({c.reviews})</span>
                      </span>
                    ) : <span className="text-[11px] text-foreground-muted">New</span>}
                    <span className="text-sm font-bold">${c.price}</span>
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
