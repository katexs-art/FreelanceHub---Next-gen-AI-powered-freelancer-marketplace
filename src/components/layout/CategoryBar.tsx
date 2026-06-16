import { useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";

export const NAV_CATEGORIES = [
  { label: "Trending 🔥", slug: "trending" },
  { label: "GoHighLevel",  slug: "gohighlevel" },
  { label: "Voice AI",     slug: "voice-ai" },
  { label: "Chat AI",      slug: "chat-ai" },
  { label: "AI Automation", slug: "ai-automation" },
  { label: "LLM & AI",    slug: "llm-ai" },
  { label: "AI Content",  slug: "ai-content" },
  { label: "AI Build Stack", slug: "ai-build-stack" },
  { label: "AI Strategy", slug: "ai-strategy" },
] as const;

const DROPDOWNS: Record<string, { label: string; slug: string }[]> = {
  "gohighlevel": [
    { label: "GHL Setup & Configuration", slug: "ghl-setup" },
    { label: "GHL Funnels & Pipelines",   slug: "ghl-funnels" },
    { label: "GHL Automations",           slug: "ghl-automations" },
    { label: "GHL Snapshots",             slug: "ghl-snapshots" },
    { label: "GHL Integrations",          slug: "ghl-integrations" },
    { label: "GHL Support & Training",    slug: "ghl-support" },
  ],
  "voice-ai": [
    { label: "Voice Agents",              slug: "voice-agents" },
    { label: "Voice Cloning",             slug: "voice-cloning" },
    { label: "IVR & Call Flows",          slug: "ivr-call-flows" },
    { label: "Conversational AI",         slug: "conversational-ai" },
    { label: "Text-to-Speech",            slug: "text-to-speech" },
  ],
  "chat-ai": [
    { label: "Customer Support Bots",     slug: "support-bots" },
    { label: "Sales Chatbots",            slug: "sales-chatbots" },
    { label: "WhatsApp & SMS Bots",       slug: "whatsapp-bots" },
    { label: "Knowledge Base Bots",       slug: "knowledge-bots" },
    { label: "Chatbot Training",          slug: "chatbot-training" },
  ],
  "ai-automation": [
    { label: "Zapier & Make Automations", slug: "zapier-make" },
    { label: "n8n Workflows",             slug: "n8n" },
    { label: "AI Email Automation",       slug: "email-automation" },
    { label: "CRM Automation",            slug: "crm-automation" },
    { label: "Data Pipelines",            slug: "data-pipelines" },
  ],
  "llm-ai": [
    { label: "Fine-tuning",               slug: "fine-tuning" },
    { label: "Prompt Engineering",        slug: "prompt-engineering" },
    { label: "RAG Systems",               slug: "rag-systems" },
    { label: "Custom LLM Apps",           slug: "custom-llm" },
    { label: "AI Agents & Crews",         slug: "ai-agents" },
  ],
  "ai-content": [
    { label: "AI Copywriting",            slug: "ai-copywriting" },
    { label: "AI Video Scripts",          slug: "ai-scripts" },
    { label: "AI Blog Writing",           slug: "ai-blogging" },
    { label: "AI Social Media",           slug: "ai-social" },
    { label: "AI Image Prompts",          slug: "ai-image-prompts" },
  ],
  "ai-build-stack": [
    { label: "No-Code AI Apps",           slug: "no-code-ai" },
    { label: "Bubble & Webflow + AI",     slug: "bubble-webflow-ai" },
    { label: "API Integrations",          slug: "api-integrations" },
    { label: "AI SaaS Development",       slug: "ai-saas" },
    { label: "AI Prototypes",             slug: "ai-prototypes" },
  ],
  "ai-strategy": [
    { label: "AI Consulting",             slug: "ai-consulting" },
    { label: "AI Audits",                 slug: "ai-audits" },
    { label: "AI Roadmapping",            slug: "ai-roadmapping" },
    { label: "AI Training & Workshops",   slug: "ai-training" },
    { label: "AI ROI Analysis",           slug: "ai-roi" },
  ],
};

export function CategoryBar() {
  const location = useLocation();
  const [params] = useSearchParams();
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const activeCat = params.get("category") ?? "";
  const activeSlug = NAV_CATEGORIES.find(
    (c) =>
      activeCat.toLowerCase().includes(c.slug) ||
      location.pathname === `/category/${c.slug}`,
  )?.slug ?? "";

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

      {/* ── pill row ─────────────────────────────────── */}
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

          return (
            <div
              key={cat.slug}
              style={{ position: "relative", flexShrink: 0 }}
              onMouseEnter={() => hasDropdown && setOpenSlug(cat.slug)}
              onMouseLeave={() => setOpenSlug(null)}
            >
              <Link
                to={`/services?category=${encodeURIComponent(cat.label.replace(" 🔥", ""))}`}
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
                    style={{ opacity: 0.5, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}
                  >
                    <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                )}
              </Link>

              {/* ── dropdown ─────────────────────────── */}
              {hasDropdown && isOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#111111",
                  border: "1px solid #1e1e1e",
                  borderRadius: 10,
                  padding: "6px 0",
                  minWidth: 210,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                  zIndex: 200,
                }}>
                  {DROPDOWNS[cat.slug].map((sub) => (
                    <Link
                      key={sub.slug}
                      to={`/services?category=${encodeURIComponent(sub.label)}`}
                      style={{
                        display: "block",
                        padding: "9px 16px",
                        fontSize: 13,
                        color: "#aaa",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        transition: "background 0.12s, color 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.background = "#1a1a1a";
                        el.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.background = "transparent";
                        el.style.color = "#aaa";
                      }}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
