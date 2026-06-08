import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Home, Search, FileText } from "lucide-react";

const NotFound = () => {
  const { user, profile } = useAuth();

  const dashHref =
    profile?.role === "admin" ? "/admin" :
    profile?.role === "seller" ? "/seller/hq" : "/buyer/hq";

  const cards = [
    { to: "/",         Icon: Home,     label: "Homepage" },
    { to: "/services", Icon: Search,   label: "Find Experts" },
    { to: "/post-job", Icon: FileText, label: "Post a Project" },
  ];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      <SiteHeader showCategories={false} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <p style={{ fontSize: 120, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.06em", lineHeight: 1, margin: 0, userSelect: "none" }}>
            404
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "16px 0 8px" }}>
            This page doesn't exist.
          </h1>
          <p style={{ fontSize: 14, color: "#888", margin: 0 }}>
            Let's get you back on track. Try one of these instead:
          </p>

          <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {cards.map(({ to, Icon, label }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 8, padding: "20px 12px",
                  borderRadius: 16, border: "1px solid #1e1e1e",
                  background: "#111", color: "#ccc",
                  textDecoration: "none", fontSize: 13, fontWeight: 500,
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#333"; el.style.color = "#fff"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#1e1e1e"; el.style.color = "#ccc"; }}
              >
                <Icon size={20} color="#888" />
                {label}
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 32 }}>
            <Link
              to={user ? dashHref : "/"}
              style={{
                display: "inline-block",
                background: "#22c55e", color: "#000",
                fontWeight: 600, fontSize: 14,
                padding: "11px 28px", borderRadius: 999,
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#16a34a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#22c55e"; }}
            >
              {user ? "Go to dashboard →" : "Go home →"}
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};

export default NotFound;
