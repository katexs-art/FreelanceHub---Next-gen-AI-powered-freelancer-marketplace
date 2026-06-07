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

export function CategoryBar() {
  const location = useLocation();
  const [params] = useSearchParams();

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
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      <style>{`
        .kx-catbar-inner::-webkit-scrollbar { display: none; }
        .kx-cat { transition: color .15s, border-color .15s; }
        .kx-cat:hover { color: #fff !important; }
      `}</style>
      <div
        className="kx-catbar-inner"
        style={{
          display: "flex",
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "0 24px",
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        {NAV_CATEGORIES.map((cat) => {
          const isActive = cat.slug === activeSlug;
          return (
            <Link
              key={cat.slug}
              to={`/services?category=${encodeURIComponent(cat.label.replace(" 🔥", ""))}`}
              className="kx-cat"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#ffffff" : "#888",
                borderBottom: `2px solid ${isActive ? "#16A34A" : "transparent"}`,
                whiteSpace: "nowrap",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
