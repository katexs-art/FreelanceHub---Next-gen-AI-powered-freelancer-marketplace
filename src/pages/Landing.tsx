import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { Search, Mic, MessageSquare, Zap, Terminal, Briefcase, Cpu, PenTool, Plug, FileText, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { riverScoreText, RiverNewPill } from "@/lib/riverScore";
import landingHero from "@/assets/landing-hero.mp4.asset.json";


const VIDEO_URL = landingHero.url;

const CATEGORIES = [
  { label: "Voice AI", slug: "voice-ai", desc: "Voice agents, cloning, IVR & calling", Icon: Mic, color: "#7F77DD" },
  { label: "Chatbot Development", slug: "chatbot-development", desc: "Custom chatbots for sales & support", Icon: MessageSquare, color: "#16A34A" },
  { label: "AI Automation", slug: "ai-automation", desc: "Workflows that run your business", Icon: Zap, color: "#F59E0B" },
  { label: "Prompt Engineering", slug: "prompt-engineering", desc: "Optimized prompts for any model", Icon: Terminal, color: "#06B6D4" },
  { label: "AI Consulting", slug: "ai-consulting", desc: "Strategy, audits & implementation", Icon: Briefcase, color: "#EC4899" },
  { label: "Custom AI Models", slug: "custom-ai-models", desc: "Fine-tuning & bespoke models", Icon: Cpu, color: "#8B5CF6" },
  { label: "AI Content", slug: "ai-content", desc: "Copy, scripts & creative with AI", Icon: PenTool, color: "#EF4444" },
  { label: "AI Integration", slug: "ai-integration", desc: "Connect AI to your existing stack", Icon: Plug, color: "#3B82F6" },
];

const FALLBACK_GIGS = [
  { id: "fb-1", title: "I will build a custom GPT-powered AI agent for your business", thumbnail_url: null, starting_price: 250, average_rating: 4.9, total_reviews: 42, seller: { full_name: "Alex Rivera", avatar_url: null } },
  { id: "fb-2", title: "I will create a realistic AI voice clone for your brand", thumbnail_url: null, starting_price: 120, average_rating: 5.0, total_reviews: 28, seller: { full_name: "Maya Chen", avatar_url: null } },
  { id: "fb-3", title: "I will design AI-generated product photography that converts", thumbnail_url: null, starting_price: 85, average_rating: 4.8, total_reviews: 67, seller: { full_name: "Diego Alvarez", avatar_url: null } },
  { id: "fb-4", title: "I will automate your marketing workflows with AI in 48 hours", thumbnail_url: null, starting_price: 300, average_rating: 4.9, total_reviews: 51, seller: { full_name: "Sarah Okonkwo", avatar_url: null } },
  { id: "fb-5", title: "I will write SEO-optimized AI content that ranks on Google", thumbnail_url: null, starting_price: 65, average_rating: 4.7, total_reviews: 89, seller: { full_name: "Jordan Reyes", avatar_url: null } },
  { id: "fb-6", title: "I will set up an AI customer support chatbot for your site", thumbnail_url: null, starting_price: 180, average_rating: 4.9, total_reviews: 34, seller: { full_name: "Priya Patel", avatar_url: null } },
  { id: "fb-7", title: "I will train a custom AI model on your business data", thumbnail_url: null, starting_price: 450, average_rating: 5.0, total_reviews: 19, seller: { full_name: "Marcus Cole", avatar_url: null } },
  { id: "fb-8", title: "I will create AI-powered video edits and short-form content", thumbnail_url: null, starting_price: 140, average_rating: 4.8, total_reviews: 56, seller: { full_name: "Lena Wu", avatar_url: null } },
];

const FALLBACK_SELLERS = [
  { id: "fb-s1", username: "alexrivera", full_name: "Alex Rivera", avatar_url: null, bio: "AI agent specialist — building GPT-powered automations for startups.", river_score: 9.4, seller_skills: ["AI Agents", "GPT", "Automation"], startingPrice: 250 },
  { id: "fb-s2", username: "mayachen", full_name: "Maya Chen", avatar_url: null, bio: "Brand & voice AI designer with 7+ years crafting identities.", river_score: 9.2, seller_skills: ["Voice AI", "Branding"], startingPrice: 120 },
  { id: "fb-s3", username: "diegoalvarez", full_name: "Diego Alvarez", avatar_url: null, bio: "Full-stack developer — React, Node, Supabase. Ship MVPs in days.", river_score: 9.1, seller_skills: ["React", "Node.js", "Supabase"], startingPrice: 85 },
  { id: "fb-s4", username: "sarahokonkwo", full_name: "Sarah Okonkwo", avatar_url: null, bio: "Copywriter for SaaS and DTC. Words that sell, not just sit there.", river_score: 9.0, seller_skills: ["Copywriting", "SEO"], startingPrice: 65 },
  { id: "fb-s5", username: "kevinherring", full_name: "Kevin Herring", avatar_url: null, bio: "AI marketing automation expert — Klaviyo, HubSpot, custom flows.", river_score: 8.9, seller_skills: ["Marketing", "Automation"], startingPrice: 180 },
  { id: "fb-s6", username: "priyapatel", full_name: "Priya Patel", avatar_url: null, bio: "Chatbot & support AI specialist. Deflect tickets, delight users.", river_score: 8.8, seller_skills: ["Chatbots", "Support AI"], startingPrice: 150 },
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
  const [sellersLoading, setSellersLoading] = useState(true);
  const [featuredGigs, setFeaturedGigs] = useState<any[]>([]);
  const [gigsLoading, setGigsLoading] = useState(true);
  const [stats, setStats] = useState<{ experts: string; paid: string; satisfaction: string } | null>(null);
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
      try {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url,bio,river_score,seller_skills")
          .eq("seller_status", "approved")
          .order("river_score", { ascending: false, nullsFirst: false })
          .limit(6);
        if (profErr) console.error("[Landing] top sellers query error:", profErr);
        const ids = (profs ?? []).map((p: any) => p.id);
        let priceById = new Map<string, number>();
        if (ids.length) {
          const { data: gigs, error: gigErr } = await supabase
            .from("gigs")
            .select("seller_id,starting_price")
            .in("seller_id", ids)
            .eq("status", "active")
            .order("starting_price", { ascending: true });
          if (gigErr) console.error("[Landing] seller-pricing query error:", gigErr);
          (gigs ?? []).forEach((g: any) => {
            if (!priceById.has(g.seller_id)) priceById.set(g.seller_id, g.starting_price);
          });
        }
        const mapped = (profs ?? []).map((p: any) => ({ ...p, startingPrice: priceById.get(p.id) ?? null }));
        setSellers(mapped.length ? mapped : FALLBACK_SELLERS);
      } catch (e) {
        console.error("[Landing] top sellers fetch failed:", e);
        setSellers(FALLBACK_SELLERS);
      } finally {
        setSellersLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: gigs, error } = await supabase
          .from("gigs")
          .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
          .eq("status", "active")
          .order("total_orders", { ascending: false, nullsFirst: false })
          .limit(8);
        if (error) console.error("[Landing] featured gigs query error:", error);
        const sellerIds = [...new Set((gigs ?? []).map((g: any) => g.seller_id))];
        let sellerMap = new Map<string, any>();
        if (sellerIds.length) {
          const { data: profs, error: pErr } = await supabase
            .from("profiles")
            .select("id,username,full_name,avatar_url")
            .in("id", sellerIds);
          if (pErr) console.error("[Landing] featured gig sellers query error:", pErr);
          (profs ?? []).forEach((p: any) => sellerMap.set(p.id, p));
        }
        const mapped = (gigs ?? []).map((g: any) => ({ ...g, seller: sellerMap.get(g.seller_id) }));
        setFeaturedGigs(mapped.length ? mapped : FALLBACK_GIGS);
      } catch (e) {
        console.error("[Landing] featured gigs fetch failed:", e);
        setFeaturedGigs(FALLBACK_GIGS);
      } finally {
        setGigsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [{ count: expertsCount }, paidRes, reviewsRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("seller_status", "approved").is("suspended_at", null),
          supabase.from("orders").select("seller_earnings").eq("status", "completed"),
          supabase.from("reviews").select("rating").eq("is_public", true),
        ]);
        const paidCents = (paidRes.data ?? []).reduce((s: number, o: any) => s + (o.seller_earnings ?? 0), 0);
        const ratings = (reviewsRes.data ?? []).map((r: any) => r.rating).filter((n: number) => typeof n === "number");
        const positive = ratings.filter((n: number) => n >= 4).length;
        const fmtPaid = (c: number) => {
          const d = c / 100;
          if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M+`;
          if (d >= 1_000) return `$${(d / 1_000).toFixed(1)}K+`;
          return `$${Math.round(d)}`;
        };
        const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K+` : `${n}+`);
        setStats({
          experts: fmtCount(expertsCount ?? 0),
          paid: fmtPaid(paidCents),
          satisfaction: ratings.length ? `${Math.round((positive / ratings.length) * 100)}%` : "—",
        });
      } catch (e) {
        console.error("[Landing] stats fetch failed:", e);
      }
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
          .kx-grid-cats { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .kx-grid-gigs { grid-template-columns: 1fr !important; }
          .kx-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .kx-grid-3 { grid-template-columns: 1fr !important; }
          .kx-grid-stats { grid-template-columns: 1fr 1fr !important; }
        }
        .kx-cat-card { transition: all 0.2s ease; }
        .kx-cat-card:hover { border-color: #fff !important; box-shadow: 0 4px 20px rgba(255,255,255,0.08); transform: translateY(-2px); }
        .kx-btn-primary:hover { background: #eee !important; }
        .kx-seller-card { transition: all 0.2s ease; }
        .kx-seller-card:hover { border-color: #fff !important; box-shadow: 0 4px 20px rgba(255,255,255,0.06); }
        @keyframes kxShimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .kx-shimmer { background: linear-gradient(90deg, #161616 0%, #222 50%, #161616 100%); background-size: 800px 100%; animation: kxShimmer 1.4s linear infinite; }
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
            textAlign: "center", padding: "80px 24px 0",
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
      <section className="kx-section" style={{ background: "#000", padding: "80px" }}>
        <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888888", marginBottom: 12 }}>
          Browse by category
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 500, color: "#fff", margin: "0 0 32px" }}>What do you need done?</h2>
        <div className="kx-grid-cats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {CATEGORIES.map((c) => {
            const Icon = c.Icon;
            return (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="kx-cat-card"
                style={{
                  background: "#1a1a1a", border: "1px solid #333333", borderRadius: 16,
                  padding: 28, display: "block", textDecoration: "none",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: `${c.color}1F`,
                  border: `1px solid ${c.color}55`, display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: 20,
                }}>
                  <Icon size={20} color={c.color} strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#ffffff", marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.5, marginBottom: 16 }}>{c.desc}</div>
                <div style={{ fontSize: 12, color: c.color }}>Browse →</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="kx-section" style={{ background: "#0a0a0a", padding: "80px", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888888", marginBottom: 12 }}>
            How it works
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 500, color: "#fff", margin: "0 0 48px" }}>Three steps to ship</h2>
          <div className="kx-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {[
              { Icon: FileText, t: "Post your need", d: "Describe your project in plain English. No forms, no friction." },
              { Icon: Sparkles, t: "Get matched by River", d: "Our AI finds the top experts for your job and notifies them instantly." },
              { Icon: CheckCircle2, t: "Work gets done", d: "Pay into escrow, approve delivery, and funds release automatically." },
            ].map(({ Icon, t, d }, i) => (
              <div key={t} style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 16, padding: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Icon size={22} color="#fff" strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Step {i + 1}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#fff", marginBottom: 8 }}>{t}</div>
                <div style={{ fontSize: 14, color: "#cccccc", lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED GIGS */}
      <section className="kx-section" style={{ background: "#000", padding: "80px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888888", marginBottom: 8 }}>
              Featured services
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 500, color: "#fff", margin: 0 }}>Hand-picked gigs</h2>
          </div>
          <Link to="/services" style={{ fontSize: 14, color: "#fff", textDecoration: "none" }}>Browse all →</Link>
        </div>
        <div className="kx-grid-gigs" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {gigsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="kx-shimmer" style={{ border: "1px solid #2a2a2a", borderRadius: 16, height: 280 }} />
              ))
            : featuredGigs.map((g: any) => {
                  const seller = g.seller || {};
                  const sName = seller.full_name || seller.username || "Expert";
                  const sInit = sName.charAt(0).toUpperCase();
                  return (
                    <Link
                      key={g.id}
                      to={`/gig/${g.id}`}
                      className="kx-cat-card"
                      style={{
                        background: "#1a1a1a", border: "1px solid #333", borderRadius: 16,
                        overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column",
                      }}
                    >
                      <div style={{
                        width: "100%", aspectRatio: "16 / 10",
                        background: g.thumbnail_url
                          ? `url(${g.thumbnail_url}) center/cover`
                          : "linear-gradient(135deg, #2a2a2a, #1a1a1a)",
                      }} />
                      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {seller.avatar_url ? (
                            <img src={seller.avatar_url} alt={sName} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#ccc" }}>{sInit}</div>
                          )}
                          <span style={{ fontSize: 12, color: "#cccccc" }}>{sName}</span>
                        </div>
                        <div style={{
                          fontSize: 14, color: "#fff", lineHeight: 1.4, display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1,
                        }}>
                          {g.title}
                        </div>
                        {g.average_rating ? (
                          <div style={{ fontSize: 12, color: "#cccccc" }}>
                            ★ {Number(g.average_rating).toFixed(1)} <span style={{ color: "#888" }}>({g.total_reviews ?? 0})</span>
                          </div>
                        ) : null}
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", borderTop: "1px solid #2a2a2a", paddingTop: 10 }}>
                          From ${g.starting_price}
                        </div>
                      </div>
                    </Link>
                  );
                })}
        </div>
      </section>


      {/* TOP PERFORMERS */}
      <section className="kx-section" style={{ background: "#000", padding: "60px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <h2 style={{ fontSize: 32, fontWeight: 500, color: "#fff", margin: 0 }}>Top performers this week</h2>
          <Link to="/services" style={{ fontSize: 14, color: "#fff", textDecoration: "none" }}>Browse all experts →</Link>
        </div>
        <div className="kx-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {sellersLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="kx-shimmer" style={{ border: "1px solid #2a2a2a", borderRadius: 16, height: 240 }} />
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

      {/* TRUST STATS */}
      <section className="kx-section" style={{ background: "#000", padding: "60px 80px" }}>
        <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888888", marginBottom: 12 }}>
          By the numbers
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 500, color: "#fff", margin: "0 0 40px" }}>Trusted by builders</h2>
        <div className="kx-grid-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { v: stats?.experts ?? "—", l: "Verified AI experts" },
            { v: stats?.paid ?? "—", l: "Paid out to experts" },
            { v: "3 days", l: "Average payment time" },
            { v: stats?.satisfaction ?? "—", l: "Satisfaction rate" },
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

      <SiteFooter />
    </div>
  );
}
