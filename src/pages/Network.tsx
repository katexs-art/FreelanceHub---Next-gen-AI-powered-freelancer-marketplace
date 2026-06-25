import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";

const SPECIALISTS = [
  {
    name: "Marcus T.",
    role: "Voice AI Specialist",
    skills: ["Voice AI", "Twilio", "ElevenLabs"],
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
    bio: "Marcus has built AI voice receptionists for over 40 service businesses across the US. Specializes in HVAC, dental, and law firm voice systems.",
  },
  {
    name: "Sarah K.",
    role: "Automation Expert",
    skills: ["Make.com", "Zapier", "n8n"],
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=face",
    bio: "Sarah designs and builds end-to-end automation workflows that eliminate manual work. She has automated operations for 60+ businesses.",
  },
  {
    name: "Priya M.",
    role: "Chat AI Developer",
    skills: ["ChatBot", "Voiceflow", "GPT"],
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face",
    bio: "Priya builds intelligent chat agents for websites and SMS that qualify leads and book appointments automatically around the clock.",
  },
  {
    name: "James R.",
    role: "GoHighLevel Specialist",
    skills: ["GHL", "CRM", "Funnels"],
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face",
    bio: "James is a certified GHL expert who builds complete CRM systems, pipelines, and automation workflows for service businesses.",
  },
  {
    name: "Aisha L.",
    role: "AI Systems Builder",
    skills: ["AI Agents", "APIs", "Integration"],
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face",
    bio: "Aisha architects full AI systems that connect voice, chat, CRM, and follow-up into one seamless automated operation.",
  },
  {
    name: "Daniel W.",
    role: "Prompt Engineer",
    skills: ["GPT-4", "Claude", "Prompting"],
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face",
    bio: "Daniel designs and optimizes AI prompts and system instructions for business-specific use cases across every industry.",
  },
  {
    name: "Nina C.",
    role: "Virtual Assistant Lead",
    skills: ["Admin", "Outreach", "Support"],
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face",
    bio: "Nina manages client communications, inbox management, cold outreach, and day-to-day operations for busy business owners.",
  },
  {
    name: "Ryan B.",
    role: "App & Web Developer",
    skills: ["React", "Webflow", "Mobile"],
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
    bio: "Ryan builds high-converting websites, landing pages, and mobile apps integrated with AI tools and automation systems.",
  },
  {
    name: "Elena V.",
    role: "Growth & Marketing Strategist",
    skills: ["Ads", "SEO", "Cold Email"],
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
    bio: "Elena builds full growth systems including paid ads, cold email infrastructure, LinkedIn outreach, and lead generation for service businesses.",
  },
];

const STATS = [
  { value: "9+", label: "Vetted Specialists" },
  { value: "6", label: "Disciplines" },
  { value: "48h", label: "Average Go-Live" },
];

export default function Network() {
  return (
    <>
      <SEO
        title="Specialist Network — Katexs"
        description="Every expert. Vetted. Ready to work on your project. Browse our AI specialist network."
      />
      <SiteHeader />

      <div style={{ background: "#000000", minHeight: "100vh" }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 64px", textAlign: "center" }}>
          <div style={{
            display: "inline-block", padding: "4px 14px",
            border: "0.5px solid #333", borderRadius: 20,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            color: "#888", marginBottom: 24,
            fontFamily: "monospace",
          }}>
            OUR SPECIALIST NETWORK
          </div>

          <h1 style={{
            fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700,
            color: "#ffffff", lineHeight: 1.15, margin: "0 0 20px",
          }}>
            Every expert. Vetted. Ready to work<br />on your project.
          </h1>

          <p style={{
            fontFamily: "monospace", fontSize: 14, color: "#666",
            maxWidth: 640, margin: "0 auto 48px", lineHeight: 1.7,
          }}>
            Our AI matches you to the right specialist based on your brief. Every specialist is vetted,
            tested, and approved by Katexs before joining the network.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{
                padding: "20px 40px",
                borderLeft: i > 0 ? "0.5px solid #222" : "none",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 6, fontFamily: "monospace" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Grid ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
          }}>
            {SPECIALISTS.map((s) => (
              <div key={s.name} style={{
                background: "#0a0a0a",
                border: "0.5px solid #222",
                borderRadius: 12,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                {/* Avatar row */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <img
                      src={s.photo}
                      alt={s.name}
                      style={{
                        width: 80, height: 80, borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #ffffff",
                        display: "block",
                      }}
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.background = "#1a1a1a";
                        el.src = "";
                      }}
                    />
                    {/* Green availability dot */}
                    <div style={{
                      position: "absolute", bottom: 3, right: 3,
                      width: 14, height: 14, borderRadius: "50%",
                      background: "#22c55e",
                      border: "2px solid #0a0a0a",
                    }} />
                  </div>

                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 2 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#888", fontFamily: "monospace", marginBottom: 8 }}>{s.role}</div>
                    {/* Verified badge */}
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: "#0d1f13", border: "0.5px solid #22c55e",
                      borderRadius: 20, padding: "2px 10px",
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: "0.05em" }}>
                        KATEXS VERIFIED
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skill pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.skills.map((skill) => (
                    <span key={skill} style={{
                      padding: "3px 10px", borderRadius: 20,
                      background: "#111111", border: "0.5px solid #2a2a2a",
                      fontSize: 11, color: "#aaa",
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Bio */}
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.6, margin: 0 }}>{s.bio}</p>

                {/* Available now */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#22c55e" }}>Available now</span>
                </div>

                {/* CTA button */}
                <Link
                  to="/submit"
                  style={{
                    display: "block", textAlign: "center",
                    padding: "10px 0", borderRadius: 8,
                    background: "#000000", border: "0.5px solid #333",
                    color: "#ffffff", fontSize: 13, fontWeight: 600,
                    textDecoration: "none",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "#22c55e";
                    el.style.background = "#0d1f13";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "#333";
                    el.style.background = "#000000";
                  }}
                >
                  View profile
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA section ──────────────────────────────────────────── */}
        <div style={{
          background: "#000000",
          borderTop: "0.5px solid #1e1e1e",
          padding: "80px 24px",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
            Not sure which specialist you need?
          </h2>
          <p style={{ fontSize: 15, color: "#666", marginBottom: 36, maxWidth: 500, margin: "0 auto 36px" }}>
            Submit your brief and our AI will match you to the right expert automatically.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/submit"
              style={{
                padding: "13px 28px", borderRadius: 8,
                background: "#22c55e", color: "#000000",
                fontWeight: 700, fontSize: 14, textDecoration: "none",
              }}
            >
              Submit your project →
            </Link>
            <Link
              to="/free-audit"
              style={{
                padding: "13px 28px", borderRadius: 8,
                background: "transparent", color: "#ffffff",
                border: "0.5px solid #333",
                fontWeight: 600, fontSize: 14, textDecoration: "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#22c55e"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#333"; }}
            >
              Get a free AI audit →
            </Link>
          </div>
        </div>

      </div>

      <SiteFooter />
    </>
  );
}
