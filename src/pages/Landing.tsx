import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Search, ArrowRight, Send } from "lucide-react";
import logo from "@/assets/katexs-logo-white.jpg";
import { useExperts } from "@/hooks/useExperts";
import { ExpertCard } from "@/components/marketplace/ExpertCard";
import { RiverChat } from "@/components/marketplace/RiverChat";

const C = {
  black: "#000000",
  white: "#ffffff",
  gray: "#888888",
  dim: "#444444",
  border: "#1c1c1c",
  border2: "#2a2a2a",
  card: "#050505",
  cardHover: "#0c0c0c",
  neon: "#caff00",
  neonDim: "rgba(202,255,0,0.12)",
};

const FONT = `'DM Sans', system-ui, sans-serif`;
const MONO = `'Space Mono', ui-monospace, monospace`;

// ───── Buttons ─────
const btnOutline: React.CSSProperties = {
  border: "1px solid #333",
  color: C.white,
  background: "transparent",
  borderRadius: 999,
  fontSize: "0.82rem",
  padding: "0.55rem 1.4rem",
  cursor: "pointer",
  fontFamily: FONT,
  transition: "all 0.2s",
};
const btnFilled: React.CSSProperties = {
  border: `1px solid ${C.white}`,
  color: C.black,
  background: C.white,
  borderRadius: 999,
  fontSize: "0.82rem",
  padding: "0.55rem 1.4rem",
  cursor: "pointer",
  fontFamily: FONT,
  fontWeight: 600,
  transition: "opacity 0.2s",
};
const btnNeon: React.CSSProperties = {
  border: `1px solid ${C.neon}`,
  color: C.black,
  background: C.neon,
  borderRadius: 999,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT,
  transition: "opacity 0.2s",
};

// ───── Nav ─────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = ["Find talent", "Post a job", "Sell"];
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 64,
        background: "rgba(0,0,0,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `0.5px solid ${scrolled ? "#2a2a2a" : C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
      }}
    >
      <Link to="/" aria-label="Katexs home">
        <img src={logo} alt="Katexs" style={{ height: 26, display: "block" }} />
      </Link>
      <div className="katexs-nav-links" style={{ display: "flex", gap: "1.75rem" }}>
        {links.map((l) => (
          <a
            key={l}
            href="#"
            style={{
              color: C.gray,
              fontSize: "0.8rem",
              letterSpacing: "0.01em",
              textDecoration: "none",
              transition: "color 0.15s",
              fontFamily: FONT,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.gray)}
          >
            {l}
          </a>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Link to="/login" style={btnOutline as any}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#555"; (e.currentTarget as HTMLElement).style.background = "#111"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#333"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >Log in</Link>
        <Link to="/signup" style={btnFilled as any}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >Join free</Link>
      </div>
    </nav>
  );
}

// ───── Hero ─────
function Hero() {
  return (
    <section
      style={{
        minHeight: "calc(100vh - 64px)",
        background: C.black,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          border: "0.5px solid #222",
          background: "transparent",
          padding: "0.3rem 1rem",
          borderRadius: 999,
          color: C.gray,
          fontSize: "0.78rem",
          marginBottom: "2rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          fontFamily: FONT,
        }}
      >
        <span
          style={{
            background: C.neon,
            color: C.black,
            fontWeight: 700,
            fontSize: "0.62rem",
            padding: "0.1rem 0.4rem",
            borderRadius: 999,
            letterSpacing: "0.04em",
          }}
        >
          NEW
        </span>
        World's first AI-only marketplace — live now →
      </div>

      <h1
        className="katexs-hero-headline"
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 0.96,
          fontSize: "clamp(3rem, 8.5vw, 7.5rem)",
          margin: 0,
        }}
      >
        <div style={{ color: C.white }}>Every AI Expert.</div>
        <div style={{ color: C.neon }}>One Marketplace.</div>
        <div style={{ color: C.border2 }}>Built Different.</div>
      </h1>

      <div style={{ marginTop: "2rem", marginBottom: "2.5rem", maxWidth: 720 }}>
        <p style={{ color: C.white, fontWeight: 600, fontSize: "1rem", margin: 0, fontFamily: FONT }}>
          Services. Tools. Agents. Consulting. Education.
        </p>
        <p style={{ color: C.gray, fontWeight: 300, fontSize: "0.95rem", marginTop: "0.5rem", fontFamily: FONT }}>
          River finds the right expert for your business in seconds — not days.
        </p>
      </div>

      <div className="katexs-hero-buttons" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          style={{ ...btnNeon, fontSize: "0.85rem", padding: "0.85rem 2rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          <Sparkles size={16} /> Find My Expert
        </button>
        <button
          style={{ ...btnOutline, fontSize: "0.85rem", padding: "0.85rem 2rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#555"; (e.currentTarget as HTMLElement).style.background = "#111"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#333"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          Sell on Katexs →
        </button>
      </div>
    </section>
  );
}

// ───── Search ─────
function SearchSection() {
  const tags = ["GHL full build", "Voice AI setup", "Automation workflows", "AI consulting", "Chat agents", "Prompt engineering"];
  return (
    <section style={{ padding: "1.5rem 2.5rem", background: C.black }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          border: "0.5px solid #222",
          background: C.card,
          borderRadius: 999,
          padding: "0.5rem 0.5rem 0.5rem 1.25rem",
          maxWidth: 580,
          margin: "0 auto",
        }}
      >
        <Search size={16} color={C.gray} />
        <input
          placeholder="Search 2,400+ AI & GHL experts..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.gray,
            fontSize: "0.88rem",
            fontFamily: FONT,
          }}
        />
        <button style={{ ...btnFilled, padding: "0.5rem 1.2rem", fontSize: "0.78rem" }}>Search</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem", marginTop: "1.2rem" }}>
        {tags.map((t) => (
          <button
            key={t}
            style={{
              border: "0.5px solid #1a1a1a",
              color: C.dim,
              borderRadius: 999,
              padding: "0.25rem 0.85rem",
              fontSize: "0.72rem",
              background: "transparent",
              cursor: "pointer",
              fontFamily: FONT,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.gray; (e.currentTarget as HTMLElement).style.borderColor = "#333"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.dim; (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"; }}
          >
            {t}
          </button>
        ))}
      </div>
    </section>
  );
}

// ───── Stats ─────
function Stats() {
  const stats = [
    { num: "2,400", suf: "+", label: "Verified experts" },
    { num: "14", suf: "K+", label: "Projects completed" },
    { num: "4.9", suf: "★", label: "Average rating" },
    { num: "47", suf: "sec", label: "River match time" },
  ];
  return (
    <section
      className="katexs-stats"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: `0.5px solid ${C.border}`,
        borderBottom: `0.5px solid ${C.border}`,
        background: C.black,
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: "1.6rem 1.5rem",
            textAlign: "center",
            borderRight: i < stats.length - 1 ? `0.5px solid ${C.border}` : "none",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: 700, color: C.white, letterSpacing: "-0.03em", fontFamily: FONT }}>
            {s.num}
            <span style={{ color: C.neon }}>{s.suf}</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: C.gray, marginTop: "0.3rem", fontFamily: FONT }}>{s.label}</div>
        </div>
      ))}
    </section>
  );
}

// ───── Eyebrow ─────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.72rem", color: C.gray, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.2rem", fontFamily: FONT }}>
      {children}
    </div>
  );
}

// ───── Categories ─────
function Categories() {
  const cats = [
    { icon: "ti-robot", name: "AI Services", desc: "Implementation, agents, voice, chat", count: "840 listings" },
    { icon: "ti-settings-automation", name: "GHL Builds", desc: "Accounts, snapshots, workflows, SaaS", count: "510 listings" },
    { icon: "ti-brain", name: "Consulting", desc: "Strategy, audits, roadmaps, advisory", count: "290 listings" },
    { icon: "ti-school", name: "Education", desc: "Courses, certifications, training", count: "180 listings" },
    { icon: "ti-code", name: "Integrations", desc: "API, Zapier, Make, webhooks", count: "220 listings" },
    { icon: "ti-device-desktop-analytics", name: "AI Tools", desc: "Software, agents, prompt packs", count: "150 listings" },
    { icon: "ti-megaphone", name: "Funnels & Pages", desc: "Landing pages, booking pages", count: "175 listings" },
    { icon: "ti-chart-bar", name: "Reporting", desc: "Dashboards, analytics, pipelines", count: "130 listings" },
  ];
  return (
    <section style={{ padding: "4rem 2.5rem", background: C.black }}>
      <Eyebrow>Browse by category</Eyebrow>
      <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)", fontWeight: 700, letterSpacing: "-0.02em", color: C.white, marginBottom: "2rem", fontFamily: FONT }}>
        Every AI service. All in one place.
      </h2>
      <div className="katexs-cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {cats.map((c) => {
          const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          return (
            <Link
              key={c.name}
              to={`/category/${slug}`}
              style={{
                border: `0.5px solid ${C.border}`,
                borderRadius: 12,
                padding: "1.3rem 1.1rem",
                background: C.card,
                cursor: "pointer",
                transition: "all 0.25s",
                textDecoration: "none",
                display: "block",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.background = C.cardHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
            >
              <i className={`ti ${c.icon}`} style={{ fontSize: "1.3rem", color: C.white, marginBottom: "0.7rem", display: "block" }} />
              <div style={{ fontSize: "0.88rem", fontWeight: 500, color: C.white, fontFamily: FONT }}>{c.name}</div>
              <div style={{ fontSize: "0.75rem", color: C.gray, lineHeight: 1.5, marginTop: "0.25rem", fontFamily: FONT }}>{c.desc}</div>
              <div style={{ fontSize: "0.68rem", color: "#333", marginTop: "0.5rem", fontFamily: MONO }}>{c.count}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ───── Listings ─────
type Expert = {
  initials: string;
  bg: string; bd: string; col: string;
  online: boolean;
  name: string; role: string;
  category: string;
  service: string;
  respond: string; done: string; repeat: string;
  price: string; rating: string; reviews: string;
};

const experts: Expert[] = [
  { initials: "JK", bg: "#111100", bd: "#2a2a00", col: C.neon, online: true, name: "Jordan K.", role: "GHL Specialist", category: "GHL", service: "Full GHL account build with custom workflows, automations, and industry-specific snapshot — delivered and tested", respond: "1 hr", done: "47", repeat: "94%", price: "297", rating: "4.9", reviews: "47" },
  { initials: "MS", bg: "#001810", bd: "#002a1a", col: "#1d9e75", online: true, name: "Maya S.", role: "AI Architect", category: "Voice AI", service: "Voice AI agent built, deployed, and tested for your business — fully live and answering calls within days", respond: "30 min", done: "83", repeat: "97%", price: "497", rating: "5.0", reviews: "83" },
  { initials: "RL", bg: "#180e00", bd: "#2a1800", col: "#ba7517", online: false, name: "Ryan L.", role: "AI Consultant", category: "Strategy", service: "AI strategy session and full infrastructure roadmap for your business — 60-minute working session", respond: "2 hrs", done: "31", repeat: "88%", price: "197", rating: "4.8", reviews: "31" },
  { initials: "TW", bg: "#00101a", bd: "#00182a", col: "#378add", online: false, name: "Tom W.", role: "Automation Specialist", category: "Automation", service: "Complex GHL workflow architecture and multi-step automation buildout — any business, any niche, any complexity", respond: "3 hrs", done: "22", repeat: "90%", price: "347", rating: "4.9", reviews: "22" },
  { initials: "AK", bg: "#1a0019", bd: "#2a0028", col: "#d4537e", online: true, name: "Aisha K.", role: "Chat AI Developer", category: "Chat AI", service: "Intelligent chat agent built for your website, SMS, and social channels — fully automated, 24/7", respond: "1 hr", done: "61", repeat: "96%", price: "397", rating: "4.9", reviews: "61" },
  { initials: "DM", bg: "#091500", bd: "#142300", col: "#639922", online: false, name: "Daniel M.", role: "GHL SaaS Expert", category: "GHL SaaS", service: "Full GHL SaaS mode setup — pricing tiers, rebilling, branded interface, sub-account templates, and onboarding flows", respond: "4 hrs", done: "38", repeat: "91%", price: "597", rating: "4.8", reviews: "38" },
];

function Listings() {
  const filters = ["All", "GHL Builds", "Voice AI", "Automations", "Consulting", "Chat AI", "Education", "Integrations"];
  const [active, setActive] = useState("All");
  const { data: liveExperts, loading } = useExperts({
    category: active,
    limit: 6,
  });
  const showLive = !loading && liveExperts.length > 0;
  const visibleMocks = active === "All" ? experts : experts.filter((e) => e.category.toLowerCase().includes(active.toLowerCase().split(" ")[0]));
  return (
    <section style={{ padding: "0 2.5rem 4rem", background: C.black }}>
      <Eyebrow>Top rated this week</Eyebrow>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {filters.map((f) => {
          const isActive = active === f;
          return (
            <button
              key={f}
              onClick={() => setActive(f)}
              style={{
                border: `1px solid ${isActive ? "#444" : C.border}`,
                color: isActive ? C.white : C.gray,
                background: isActive ? "#111" : "transparent",
                borderRadius: 999,
                padding: "0.3rem 0.9rem",
                fontSize: "0.72rem",
                cursor: "pointer",
                fontFamily: FONT,
                transition: "all 0.15s",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>
      <div className="katexs-listings-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
        {showLive
          ? liveExperts.map((e) => <ExpertCard key={e.id} e={e} />)
          : visibleMocks.map((e, i) => <ListingCard key={i} e={e} />)}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
        <Link
          to="/browse"
          style={{ ...btnOutline, color: C.gray, borderColor: "#222", textDecoration: "none", display: "inline-block" }}
        >
          Load more experts →
        </Link>
      </div>
    </section>
  );
}

function ListingCard({ e }: { e: Expert }) {
  const isTopSeller = e.role !== "Automation Specialist";
  return (
    <div
      style={{
        border: `0.5px solid ${C.border}`,
        borderRadius: 12,
        padding: "1.3rem",
        background: C.card,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.25s",
      }}
      onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = C.border2; ev.currentTarget.style.background = C.cardHover; }}
      onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = C.border; ev.currentTarget.style.background = C.card; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.9rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div style={{ position: "relative", width: 38, height: 38 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: e.bg, border: `1px solid ${e.bd}`,
              color: e.col, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.78rem", fontWeight: 700, fontFamily: FONT,
            }}>{e.initials}</div>
            {e.online && (
              <span style={{ position: "absolute", bottom: 1, right: 1, width: 8, height: 8, background: C.neon, borderRadius: "50%", border: `1.5px solid ${C.card}` }} />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: C.white, fontSize: "0.82rem", fontWeight: 600, fontFamily: FONT }}>{e.name}</span>
              <i className="ti ti-circle-check-filled" style={{ color: C.neon, fontSize: "0.85rem" }} />
            </div>
            <div style={{ color: C.gray, fontSize: "0.7rem", fontFamily: FONT }}>{e.role}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
          {isTopSeller ? (
            <span style={{ border: "1px solid rgba(202,255,0,0.2)", color: C.neon, fontSize: "0.6rem", padding: "0.15rem 0.5rem", borderRadius: 999, fontFamily: MONO, letterSpacing: "0.05em" }}>TOP SELLER</span>
          ) : (
            <span style={{ border: "1px solid #222", color: C.gray, fontSize: "0.6rem", padding: "0.15rem 0.5rem", borderRadius: 999, fontFamily: MONO, letterSpacing: "0.05em" }}>RISING</span>
          )}
          <span style={{ border: "1px solid #222", color: C.gray, fontSize: "0.6rem", padding: "0.15rem 0.5rem", borderRadius: 999, fontFamily: MONO, letterSpacing: "0.05em" }}>{e.category.toUpperCase()}</span>
        </div>
      </div>

      <div style={{ fontSize: "0.83rem", fontWeight: 300, color: "#555", lineHeight: 1.65, marginBottom: "0.85rem", flex: 1, fontFamily: FONT }}>
        {e.service}
      </div>

      {/* Portfolio thumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.9rem" }}>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ width: 32, height: 32, background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-photo" style={{ color: "#333", fontSize: "0.85rem" }} />
          </div>
        ))}
        <span style={{ color: "#333", fontSize: "0.65rem", fontFamily: MONO, marginLeft: "0.25rem" }}>+5 more</span>
      </div>

      {/* Trust row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem" }}>
        {[
          { icon: "ti-clock", t: e.respond },
          { icon: "ti-check", t: `${e.done} done` },
          { icon: "ti-repeat", t: `${e.repeat} repeat` },
        ].map((it, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: C.dim, fontFamily: FONT, paddingRight: idx < 2 ? "0.65rem" : 0, borderRight: idx < 2 ? "1px solid #1a1a1a" : "none" }}>
            <i className={`ti ${it.icon}`} style={{ color: C.border2, fontSize: "0.8rem" }} /> {it.t}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "0.62rem", color: C.dim, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>Starting at</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: C.white, letterSpacing: "-0.02em", fontFamily: FONT }}>${e.price}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.neon, fontSize: "0.8rem" }}>★★★★★</div>
          <div style={{ color: C.dim, fontSize: "0.65rem", fontFamily: MONO }}>{e.reviews} reviews</div>
        </div>
      </div>

      <button
        style={{
          marginTop: "0.75rem",
          width: "100%",
          border: `0.5px solid ${C.border}`,
          color: C.dim,
          background: "transparent",
          borderRadius: 999,
          fontSize: "0.72rem",
          padding: "0.5rem 1rem",
          cursor: "pointer",
          fontFamily: FONT,
          transition: "all 0.2s",
        }}
        onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.borderColor = "#333"; (ev.currentTarget as HTMLElement).style.color = C.white; }}
        onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.borderColor = C.border; (ev.currentTarget as HTMLElement).style.color = C.dim; }}
      >
        Hire {e.name.split(" ")[0]} →
      </button>
    </div>
  );
}

// ───── How it works ─────
function HowItWorks() {
  const steps = [
    { n: "01 —", t: "Tell River", d: "Describe your project in plain language. No forms. No filters. Just say what you need.", tag: "Free · Instant" },
    { n: "02 —", t: "Get matched", d: "River finds your top 3 expert matches in seconds — not hours, not days.", tag: "47 sec avg" },
    { n: "03 —", t: "Pay securely", d: "Funds held until you approve delivery. 3-day review window. Zero risk to you.", tag: "Protected" },
    { n: "04 —", t: "Get it done", d: "Expert delivers. You approve. Funds release. Your business is better.", tag: "Guaranteed" },
  ];
  return (
    <section style={{ background: C.card, borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`, padding: "4rem 2.5rem" }}>
      <Eyebrow>How it works</Eyebrow>
      <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)", fontWeight: 700, letterSpacing: "-0.02em", color: C.white, marginBottom: "2rem", fontFamily: FONT }}>
        Simple process. Serious results.
      </h2>
      <div className="katexs-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {steps.map((s) => (
          <div key={s.n} style={{ border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1.4rem", background: C.black }}>
            <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "#222", marginBottom: "1rem" }}>{s.n}</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: C.white, marginBottom: "0.5rem", fontFamily: FONT }}>{s.t}</div>
            <div style={{ fontSize: "0.8rem", color: C.gray, lineHeight: 1.65, fontWeight: 300, marginBottom: "0.9rem", fontFamily: FONT }}>{s.d}</div>
            <span style={{ border: "0.5px solid #1a1a1a", color: C.dim, borderRadius: 999, fontSize: "0.65rem", padding: "0.2rem 0.7rem", fontFamily: FONT }}>{s.tag}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───── River AI ─────
function RiverSection() {
  return (
    <section style={{ padding: "4rem 2.5rem", background: C.black }}>
      <Eyebrow>Powered by River</Eyebrow>
      <div
        className="katexs-river-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: `0.5px solid ${C.border}`,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "2.2rem", borderRight: `0.5px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "center" }} className="katexs-river-left">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <span style={{ width: 8, height: 8, background: C.neon, borderRadius: "50%", animation: "katexsPulse 1.5s ease-in-out infinite" }} />
            <span style={{ color: C.neon, textTransform: "uppercase", fontFamily: MONO, fontSize: "0.68rem", letterSpacing: "0.12em" }}>
              River AI — online now
            </span>
          </div>
          <h3 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, color: C.white, margin: 0, fontFamily: FONT }}>
            Don't search. Just tell River.
          </h3>
          <p style={{ fontSize: "0.85rem", color: C.gray, lineHeight: 1.7, fontWeight: 300, marginTop: "1rem", marginBottom: "1.4rem", fontFamily: FONT }}>
            Describe your project in plain language. River reads it, finds the right expert, and presents your top 3 matches in seconds. No browsing. No guessing.
          </p>
          <button
            style={{ ...btnNeon, padding: "0.7rem 1.4rem", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.45rem", width: "fit-content" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
          >
            <Sparkles size={14} /> Talk to River
          </button>
        </div>
        <RiverChat />
      </div>
    </section>
  );
}

function Msg({ from, children }: { from: "river" | "user"; children: React.ReactNode }) {
  const isRiver = from === "river";
  return (
    <div
      style={{
        background: isRiver ? "#0a0a0a" : "#111",
        border: "0.5px solid #1a1a1a",
        borderRadius: 8,
        padding: "0.7rem 1rem",
        fontSize: "0.8rem",
        color: isRiver ? "#666" : C.gray,
        alignSelf: isRiver ? "flex-start" : "flex-end",
        maxWidth: "90%",
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  );
}

// ───── Sell Banner ─────
function SellBanner() {
  return (
    <section
      style={{
        background: C.card,
        borderTop: `0.5px solid ${C.border}`,
        borderBottom: `0.5px solid ${C.border}`,
        padding: "1.4rem 2.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <div>
        <div style={{ fontSize: "0.95rem", fontWeight: 500, color: C.white, fontFamily: FONT }}>
          Are you an AI or GHL expert? Sell on Katexs.
        </div>
        <div style={{ fontSize: "0.8rem", color: C.gray, fontWeight: 300, marginTop: "0.15rem", fontFamily: FONT }}>
          Join 2,400+ specialists already earning on the world's first AI-only marketplace.
        </div>
      </div>
      <button
        style={{ ...btnFilled, padding: "0.65rem 1.5rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
      >
        Apply to sell <ArrowRight size={14} />
      </button>
    </section>
  );
}

// ───── Footer ─────
function Footer() {
  const links = ["About", "How it works", "Support", "Privacy"];
  return (
    <footer
      style={{
        borderTop: `0.5px solid ${C.border}`,
        padding: "1.8rem 2.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        background: C.black,
      }}
    >
      <div>
        <img src={logo} alt="Katexs" style={{ height: 20, display: "block" }} />
        <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "#333", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.4rem" }}>
          World's first AI marketplace
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {links.map((l) => (
          <a
            key={l}
            href="#"
            style={{ fontSize: "0.72rem", color: C.dim, textDecoration: "none", fontFamily: FONT, transition: "color 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.gray)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.dim)}
          >
            {l}
          </a>
        ))}
      </div>
      <div style={{ fontSize: "0.68rem", color: "#222", fontFamily: FONT }}>
        © 2026 Katexs. All rights reserved.
      </div>
    </footer>
  );
}

// ───── Scroll reveal helper ─────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>("section");
    if (!els) return;
    els.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

// ───── Page ─────
const Landing = () => {
  const ref = useReveal();
  return (
    <div style={{ background: C.black, color: C.white, fontFamily: FONT, minHeight: "100vh" }}>
      <style>{`
        @keyframes katexsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (max-width: 900px) {
          .katexs-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .katexs-stats > div:nth-child(2) { border-right: none !important; }
          .katexs-cat-grid, .katexs-how-grid, .katexs-listings-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .katexs-river-grid { grid-template-columns: 1fr !important; }
          .katexs-river-left { border-right: none !important; border-bottom: 0.5px solid ${C.border} !important; }
          .katexs-nav-links { display: none !important; }
        }
        @media (max-width: 600px) {
          .katexs-listings-grid { grid-template-columns: 1fr !important; }
          .katexs-hero-headline { font-size: 3rem !important; }
          .katexs-hero-buttons { flex-direction: column !important; width: 100%; }
          .katexs-hero-buttons button { width: 100%; }
        }
      `}</style>
      <Nav />
      <main ref={ref}>
        <Hero />
        <SearchSection />
        <Stats />
        <Categories />
        <Listings />
        <HowItWorks />
        <RiverSection />
        <SellBanner />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
