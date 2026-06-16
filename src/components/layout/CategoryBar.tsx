import { useState, useRef } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";

export const NAV_CATEGORIES = [
  { label: "What's Hot 🔥", slug: "trending" },
  { label: "GoHighLevel",   slug: "gohighlevel" },
  { label: "AI & Automation", slug: "ai-automation" },
  { label: "Scale & Grow",  slug: "scale-grow" },
  { label: "Voice AI",      slug: "voice-ai" },
  { label: "Chat AI",       slug: "chat-ai" },
  { label: "LLM & AI",     slug: "llm-ai" },
  { label: "AI Content",   slug: "ai-content" },
  { label: "AI Strategy",  slug: "ai-strategy" },
] as const;

type DropdownItem = { label: string; to: string; browse?: true };

const DROPDOWNS: Record<string, DropdownItem[]> = {
  "trending": [
    { label: "AI Phone Receptionist",    to: "/services?category=voice-ai" },
    { label: "GHL Funnel Build",         to: "/services?category=gohighlevel" },
    { label: "WhatsApp Chatbot",         to: "/services?category=chat-ai" },
    { label: "n8n Automation",           to: "/services?category=ai-automation" },
    { label: "Cold Email Setup",         to: "/services?category=scale-grow" },
    { label: "Browse all trending →",   to: "/services?category=trending", browse: true },
  ],
  "gohighlevel": [
    { label: "Full GHL Funnel Build",         to: "/services?category=gohighlevel" },
    { label: "CRM Setup & Pipeline",          to: "/services?category=gohighlevel" },
    { label: "Email & SMS Automation",        to: "/services?category=gohighlevel" },
    { label: "Appointment Booking System",    to: "/services?category=gohighlevel" },
    { label: "Reputation Management",         to: "/services?category=gohighlevel" },
    { label: "White Label GHL Setup",         to: "/services?category=gohighlevel" },
    { label: "GHL Workflow Automation",       to: "/services?category=gohighlevel" },
    { label: "Browse all GoHighLevel →",      to: "/services?category=gohighlevel", browse: true },
  ],
  "ai-automation": [
    { label: "Voice AI — AI Phone Receptionist", to: "/services?category=voice-ai" },
    { label: "Voice AI — Outbound AI Caller",    to: "/services?category=voice-ai" },
    { label: "Chat AI — WhatsApp Chatbot",       to: "/services?category=chat-ai" },
    { label: "Chat AI — Website Chat Widget",    to: "/services?category=chat-ai" },
    { label: "Workflow — n8n Automation",        to: "/services?category=ai-automation" },
    { label: "Workflow — Make/Zapier Setup",     to: "/services?category=ai-automation" },
    { label: "Web Build — AI Website Build",     to: "/services?category=ai-automation" },
    { label: "Web Build — No-Code App",          to: "/services?category=ai-automation" },
    { label: "Browse all AI & Automation →",     to: "/services?category=ai-automation", browse: true },
  ],
  "scale-grow": [
    { label: "Lead Gen — Facebook/Instagram Ads", to: "/services?category=scale-grow" },
    { label: "Lead Gen — Google Ads Setup",       to: "/services?category=scale-grow" },
    { label: "Cold Outreach — Cold Email Setup",  to: "/services?category=scale-grow" },
    { label: "Cold Outreach — Instantly Setup",   to: "/services?category=scale-grow" },
    { label: "Social — Social Media Management",  to: "/services?category=scale-grow" },
    { label: "SEO — SEO Audit & Strategy",        to: "/services?category=scale-grow" },
    { label: "Brand — Logo Design",               to: "/services?category=scale-grow" },
    { label: "Brand — Brand Identity Package",    to: "/services?category=scale-grow" },
    { label: "Browse all Scale & Grow →",         to: "/services?category=scale-grow", browse: true },
  ],
  "voice-ai": [
    { label: "AI Phone Receptionist",    to: "/services?category=voice-ai" },
    { label: "Outbound AI Caller",       to: "/services?category=voice-ai" },
    { label: "Voice Cloning",            to: "/services?category=voice-ai" },
    { label: "IVR & Call Flows",         to: "/services?category=voice-ai" },
    { label: "Text-to-Speech",           to: "/services?category=voice-ai" },
    { label: "Browse all Voice AI →",   to: "/services?category=voice-ai", browse: true },
  ],
  "chat-ai": [
    { label: "WhatsApp Chatbot",         to: "/services?category=chat-ai" },
    { label: "Website Chat Widget",      to: "/services?category=chat-ai" },
    { label: "Sales Chatbot",            to: "/services?category=chat-ai" },
    { label: "Knowledge Base Bot",       to: "/services?category=chat-ai" },
    { label: "Chatbot Training",         to: "/services?category=chat-ai" },
    { label: "Browse all Chat AI →",    to: "/services?category=chat-ai", browse: true },
  ],
  "llm-ai": [
    { label: "Prompt Engineering",       to: "/services?category=llm-ai" },
    { label: "RAG Systems",              to: "/services?category=llm-ai" },
    { label: "Fine-tuning",              to: "/services?category=llm-ai" },
    { label: "Custom LLM Apps",          to: "/services?category=llm-ai" },
    { label: "AI Agents & Crews",        to: "/services?category=llm-ai" },
    { label: "Browse all LLM & AI →",   to: "/services?category=llm-ai", browse: true },
  ],
  "ai-content": [
    { label: "AI Copywriting",           to: "/services?category=ai-content" },
    { label: "AI Video Scripts",         to: "/services?category=ai-content" },
    { label: "AI Blog Writing",          to: "/services?category=ai-content" },
    { label: "AI Social Media",          to: "/services?category=ai-content" },
    { label: "AI Image Prompts",         to: "/services?category=ai-content" },
    { label: "Browse all AI Content →", to: "/services?category=ai-content", browse: true },
  ],
  "ai-strategy": [
    { label: "AI Consulting",            to: "/services?category=ai-strategy" },
    { label: "AI Audits",                to: "/services?category=ai-strategy" },
    { label: "AI Roadmapping",           to: "/services?category=ai-strategy" },
    { label: "AI Training & Workshops",  to: "/services?category=ai-strategy" },
    { label: "AI ROI Analysis",          to: "/services?category=ai-strategy" },
    { label: "Browse all AI Strategy →", to: "/services?category=ai-strategy", browse: true },
  ],
};

export function CategoryBar() {
  const location = useLocation();
  const [params] = useSearchParams();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCat = params.get("category") ?? "";
  const activeSlug = NAV_CATEGORIES.find(
    (c) =>
      activeCat.toLowerCase().includes(c.slug) ||
      location.pathname === `/category/${c.slug}`,
  )?.slug ?? "";

  function handleEnter(slug: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (slug in DROPDOWNS) setOpenSlug(slug);
  }

  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpenSlug(null), 150);
  }

  return (
    <div
      style={{
        background: "#111111",
        borderBottom: "1px solid #1e1e1e",
        position: "sticky",
        top: 64,
        zIndex: 90,
      }}
    >
      <style>{`
        .kx-cat { transition: color .15s, border-color .15s; }
        .kx-cat:hover { color: #fff !important; }
        .kx-catbar-inner::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        className="kx-catbar-inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          width: "100%",
          boxSizing: "border-box",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {NAV_CATEGORIES.map((cat) => {
          const isActive = cat.slug === activeSlug;
          const hasDropdown = cat.slug in DROPDOWNS;
          const isOpen = openSlug === cat.slug;
          const items = DROPDOWNS[cat.slug] ?? [];
          const browseItem = items.find((i) => i.browse);
          const regularItems = items.filter((i) => !i.browse);

          return (
            <div
              key={cat.slug}
              style={{ position: "relative", flexShrink: 0 }}
              onMouseEnter={() => handleEnter(cat.slug)}
              onMouseLeave={handleLeave}
            >
              <Link
                to={`/services?category=${encodeURIComponent(cat.slug)}`}
                className="kx-cat"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "12px 14px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#ffffff" : "#888",
                  borderBottom: `2px solid ${isActive ? "#16A34A" : "transparent"}`,
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {cat.label}
                {hasDropdown && (
                  <svg
                    width="10" height="10" viewBox="0 0 10 10"
                    style={{
                      opacity: 0.5,
                      transform: isOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </Link>

              {hasDropdown && isOpen && (
                <div
                  onMouseEnter={() => handleEnter(cat.slug)}
                  onMouseLeave={handleLeave}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#111111",
                    border: "0.5px solid #1e1e1e",
                    borderRadius: "0 0 12px 12px",
                    padding: "8px",
                    minWidth: 220,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                    zIndex: 100,
                  }}
                >
                  {regularItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      style={{
                        display: "block",
                        padding: "8px 14px",
                        fontSize: 12,
                        color: "#A7B0C0",
                        textDecoration: "none",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                        transition: "background 0.12s, color 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.background = "#1e1e1e";
                        el.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.background = "transparent";
                        el.style.color = "#A7B0C0";
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {browseItem && (
                    <div style={{ borderTop: "0.5px solid #1e1e1e", marginTop: 4, paddingTop: 8 }}>
                      <Link
                        to={browseItem.to}
                        style={{
                          display: "block",
                          padding: "8px 14px",
                          fontSize: 12,
                          color: "#1D4ED8",
                          textDecoration: "none",
                          borderRadius: 6,
                          whiteSpace: "nowrap",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = "#1e1e1e";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                        }}
                      >
                        {browseItem.label}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
