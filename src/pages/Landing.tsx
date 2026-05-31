import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SEO } from "@/components/SEO";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { riverScoreText, RiverNewPill } from "@/lib/riverScore";


const VIDEO_URL =
  "https://lquoahkuzqwtiihshdaf.supabase.co/storage/v1/object/public/katexs-assets/7438233-uhd_4096_2160_25fps%20(1)%20(1)%20(1).mp4";

const CATEGORIES = [
  { label: "Build with AI", slug: "build-with-ai", desc: "Custom AI apps, agents, automations" },
  { label: "Sound & Speak with AI", slug: "sound-and-speak-with-ai", desc: "Voice AI, podcasts, audio cloning" },
  { label: "Create with AI", slug: "create-with-ai", desc: "Images, video, design with AI" },
  { label: "Grow with AI", slug: "grow-with-ai", desc: "Marketing, SEO, growth automation" },
  { label: "Run with AI", slug: "run-with-ai", desc: "Ops, support, internal AI tools" },
  { label: "Understand AI", slug: "understand-ai", desc: "Data, analytics, AI insight" },
  { label: "Write with AI", slug: "write-with-ai", desc: "Copy, content, scripts with AI" },
  { label: "Learn AI", slug: "learn-ai", desc: "Tutoring, courses, AI training" },
];

type TopSeller = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  river_score: number | null;
  seller_skills: string[] | null;
  startingPrice: number | null;
};

export default function Landing() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sellers, setSellers] = useState<TopSeller[]>([]);
  const SR: any = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  const [voiceSupported] = useState<boolean>(!!SR);
  const [listening, setListening] = useState(false);
  const [micHover, setMicHover] = useState(false);
  const recogRef = useRef<any>(null);

  const startVoice = () => {
    if (!SR || listening) return;
    try {
      const r = new SR();
      r.continuous = false;
      r.interimResults = true;
      r.lang = "en-US";
      r.onresult = (e: any) => {
        let t = "";
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        setQ(t);
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      recogRef.current = r;
      setListening(true);
      r.start();
    } catch {
      setListening(false);
    }
  };


  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,bio,river_score,seller_skills")
        .eq("seller_status", "approved")
        .order("river_score", { ascending: false, nullsFirst: false })
        .limit(6);
      const ids = (profs ?? []).map((p: any) => p.id);
      let priceById = new Map<string, number>();
      if (ids.length) {
        const { data: gigs } = await supabase
          .from("gigs")
          .select("seller_id,starting_price")
          .in("seller_id", ids)
          .eq("status", "active")
          .order("starting_price", { ascending: true });
        (gigs ?? []).forEach((g: any) => {
          if (!priceById.has(g.seller_id)) priceById.set(g.seller_id, g.starting_price);
        });
      }
      setSellers(
        (profs ?? []).map((p: any) => ({ ...p, startingPrice: priceById.get(p.id) ?? null })),
      );
    })();
  }, []);

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
      <SEO
        title="KATEXS — Hire AI experts. Ship faster."
        description="Tell River what you need — the best AI experts come to you in seconds. The world's first AI-native freelance marketplace."
        jsonLd={{ "@context": "https://schema.org", "@type": "Organization", name: "Katexs", url: "https://katexs.com" }}
      />

      <style>{`
        .kx-hero-h1 { font-size: 72px; }
        @media (max-width: 768px) {
          .kx-hero-h1 { font-size: 40px !important; }
          .kx-section { padding: 48px 20px !important; }
          .kx-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .kx-grid-3 { grid-template-columns: 1fr !important; }
          .kx-grid-stats { grid-template-columns: 1fr 1fr !important; }
        }
        .kx-cat-card { transition: all 0.2s ease; }
        .kx-cat-card:hover { border-color: #fff !important; box-shadow: 0 4px 20px rgba(255,255,255,0.08); transform: translateY(-2px); }
        .kx-btn-primary:hover { background: #eee !important; }
        .kx-seller-card { transition: all 0.2s ease; }
        .kx-seller-card:hover { border-color: #fff !important; box-shadow: 0 4px 20px rgba(255,255,255,0.06); }
      `}</style>

      <SiteHeader variant="transparent" />

      {/* HERO */}
      <section style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.60)", zIndex: 1,
          }}
        />
        <div
          style={{
            position: "relative", zIndex: 2, height: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            textAlign: "center", padding: "0 24px",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)",
              color: "#fff", fontSize: 11, letterSpacing: "0.12em", padding: "6px 16px",
              borderRadius: 999, marginBottom: 32, textTransform: "uppercase",
            }}
          >
            The AI Freelance Marketplace
          </div>

          <h1
            className="kx-hero-h1"
            style={{
              color: "#fff", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.02em",
              maxWidth: 800, marginBottom: 20,
            }}
          >
            Hire AI experts. Ship faster.
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: 400,
              maxWidth: 520, lineHeight: 1.6, marginBottom: 48,
            }}
          >
            Tell River what you need — the best AI experts come to you in seconds.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/services?q=${encodeURIComponent(q.trim())}`); }}
            style={{
              background: "#fff", borderRadius: 999, overflow: "hidden",
              display: "flex", alignItems: "center", maxWidth: 580, width: "100%",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
            }}
          >
            <style>{`@keyframes kxMicPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.25); } }`}</style>
            {voiceSupported && (
              <button
                type="button"
                onClick={startVoice}
                onMouseEnter={() => setMicHover(true)}
                onMouseLeave={() => setMicHover(false)}
                aria-label={listening ? "Listening" : "Voice search"}
                style={{
                  marginLeft: 18, marginRight: 2, background: "transparent", border: "none",
                  cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {listening ? (
                  <span style={{
                    display: "inline-block", width: 12, height: 12, borderRadius: 999,
                    background: "#e11d48", animation: "kxMicPulse 1s ease-in-out infinite",
                  }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={micHover ? "#000" : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                )}
              </button>
            )}
            <Search size={18} color="#999" style={{ marginLeft: voiceSupported ? 8 : 24, flexShrink: 0 }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tell River what you need — I'll find your expert..."
              style={{
                flex: 1, padding: "18px 20px", fontSize: 15, color: "#111",
                border: "none", outline: "none", background: "transparent",
              }}
            />
            <button
              type="submit"
              className="kx-btn-primary"
              style={{
                padding: "14px 28px", fontSize: 14, fontWeight: 500, borderRadius: 999,
                margin: 6, background: "#000", color: "#fff", border: "none", cursor: "pointer",
              }}
            >
              Find My Expert
            </button>
          </form>
          {listening && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#cccccc", textAlign: "left", maxWidth: 580, width: "100%" }}>
              Listening...
            </div>
          )}


          <div
            style={{
              marginTop: 32, display: "flex", alignItems: "center", flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {["2,400+ Verified Experts", "$2.1M Paid Out", "3-Day Payments"].map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />}
                <div style={{ fontSize: 13, color: "#cccccc", padding: "0 24px" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="kx-section" style={{ background: "#000", padding: "60px 80px" }}>
        <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888888", marginBottom: 24 }}>
          What do you need done?
        </div>
        <div className="kx-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="kx-cat-card"
              style={{
                background: "#1a1a1a", border: "1px solid #333333", borderRadius: 16,
                padding: 28, display: "block", textDecoration: "none",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: "#ffffff", marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.5, marginBottom: 16 }}>{c.desc}</div>
              <div style={{ fontSize: 12, color: "#888888" }}>Browse experts</div>
              <div style={{ fontSize: 14, color: "#ffffff", marginTop: 16 }}>→</div>
            </Link>
          ))}
        </div>
      </section>

      {/* TOP PERFORMERS */}
      <section className="kx-section" style={{ background: "#000", padding: "60px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <h2 style={{ fontSize: 32, fontWeight: 500, color: "#fff", margin: 0 }}>Top performers this week</h2>
          <Link to="/services" style={{ fontSize: 14, color: "#fff", textDecoration: "none" }}>Browse all experts →</Link>
        </div>
        <div className="kx-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {sellers.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "#1a1a1a", border: "1px solid #333333", borderRadius: 16, padding: 24, height: 240 }} />
              ))
            : sellers.map((s) => {
                const displayName = s.full_name || s.username || "Expert";
                const initial = displayName.charAt(0).toUpperCase();
                return (
                  <div key={s.id} className="kx-seller-card" style={{ background: "#1a1a1a", border: "1px solid #333333", borderRadius: 16, padding: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={displayName} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 500, color: "#ccc" }}>
                          {initial}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{displayName}</div>
                        {(() => {
                          const txt = riverScoreText(s.river_score, { digits: 1 });
                          return txt ? (
                            <span style={{ display: "inline-block", marginTop: 4, background: "#fff", color: "#000", fontSize: 11, padding: "3px 10px", borderRadius: 999, fontWeight: 500 }}>
                              River Score {txt}
                            </span>
                          ) : (
                            <RiverNewPill surface="dark" style={{ marginTop: 4 }} />
                          );
                        })()}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: "#cccccc", lineHeight: 1.5, marginBottom: 12, minHeight: 42, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {s.bio || "AI specialist on Katexs."}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                      {(s.seller_skills ?? []).slice(0, 3).map((sk) => (
                        <span key={sk} style={{ background: "#252525", border: "1px solid #333", color: "#cccccc", fontSize: 11, padding: "4px 10px", borderRadius: 999 }}>{sk}</span>
                      ))}
                    </div>
                    {s.startingPrice != null && (
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 12 }}>From ${s.startingPrice}</div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link to={`/seller/${s.username ?? s.id}`} style={{ flex: 1, textAlign: "center", background: "transparent", color: "#fff", border: "1px solid #555", fontSize: 12, fontWeight: 500, padding: "8px 18px", borderRadius: 999, textDecoration: "none" }}>
                        View Profile
                      </Link>
                      <Link to={`/inbox?to=${s.id}`} style={{ flex: 1, textAlign: "center", background: "#fff", color: "#000", border: "none", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 999, textDecoration: "none" }}>
                        See Profile
                      </Link>
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="kx-section" style={{ background: "#000", padding: "80px" }}>
        <div className="kx-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48, maxWidth: 1200, margin: "0 auto" }}>
          {[
            { n: "1", t: "Tell River", d: "Describe what you need in plain English. River reads every word and understands the nuance." },
            { n: "2", t: "Get matched", d: "Top 15 experts are notified instantly. They pitch you directly — no browsing required." },
            { n: "3", t: "Ship it", d: "Pay securely into escrow. Approve delivery. Funds release in 3 days automatically." },
          ].map((s) => (
            <div key={s.n}>
              <div style={{ fontSize: 72, fontWeight: 500, color: "#f0f0f0", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#fff", marginTop: 24, marginBottom: 12 }}>{s.t}</div>
              <div style={{ fontSize: 14, color: "#cccccc", lineHeight: 1.6 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST STATS */}
      <section className="kx-section" style={{ background: "#000", padding: "60px 80px" }}>
        <div className="kx-grid-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { v: "2,400+", l: "Verified AI experts" },
            { v: "$2.1M+", l: "Paid out to experts" },
            { v: "3 days", l: "Average payment time" },
            { v: "98%", l: "Satisfaction rate" },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: "0 32px", borderLeft: i === 0 ? "none" : "1px solid #1a1a1a" }}>
              <div style={{ fontSize: 48, fontWeight: 500, color: "#fff", lineHeight: 1.1 }}>{s.v}</div>
              <div style={{ fontSize: 14, color: "#cccccc", marginTop: 8 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>


      {/* BOTTOM CTA */}
      <section style={{ background: "#000", padding: "100px 80px", textAlign: "center" }}>
        <h2 style={{ fontSize: 52, fontWeight: 500, color: "#fff", maxWidth: 600, margin: "0 auto 20px", lineHeight: 1.1 }}>
          Stop searching. Tell River.
        </h2>
        <p style={{ fontSize: 18, color: "#cccccc", maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.6 }}>
          The best AI experts are waiting. Describe your project and get matched in seconds.
        </p>
        <Link
          to="/signup"
          style={{
            display: "inline-block", background: "#fff", color: "#000", borderRadius: 999,
            padding: "16px 40px", fontSize: 16, fontWeight: 500, textDecoration: "none",
          }}
        >
          Get Started Free
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#000", padding: "60px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32 }}>
          <div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 500, letterSpacing: "0.1em", marginBottom: 12 }}>KATEXS</div>
            <div style={{ fontSize: 14, color: "#cccccc", maxWidth: 320 }}>
              The world's first AI-native freelance marketplace
            </div>
          </div>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <Link to="/services" style={{ color: "#fff", fontSize: 13, textDecoration: "none" }}>Find Experts</Link>
            <Link to="/projects" style={{ color: "#fff", fontSize: 13, textDecoration: "none" }}>Projects</Link>
            <Link to="/about" style={{ color: "#fff", fontSize: 13, textDecoration: "none" }}>About</Link>
            <Link to="/trust" style={{ color: "#fff", fontSize: 13, textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#aaaaaa" }}>© 2026 Katexs. All rights reserved.</div>
          <div style={{ display: "flex", gap: 24 }}>
            <Link to="/privacy" style={{ fontSize: 12, color: "#aaaaaa", textDecoration: "none" }}>Privacy Policy</Link>
            <Link to="/terms" style={{ fontSize: 12, color: "#aaaaaa", textDecoration: "none" }}>Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
