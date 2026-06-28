import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: "#000",
      borderBottom: "0.5px solid rgba(255,255,255,0.08)",
      padding: "0 40px",
      height: "64px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      {/* LOGO — real Katexs logo, bigger */}
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
        <img
          src="/Katexs_Logo_White.jpg"
          alt="Katexs"
          style={{
            height: "52px",
            width: "auto",
            objectFit: "contain",
          }}
        />
      </Link>

      {/* NAV LINKS */}
      <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
        {[
          { label: "Services", path: "/#services" },
          { label: "Benefits", path: "/#benefits" },
          { label: "Pricing", path: "/pricing" },
          { label: "Results", path: "/#results" },
          { label: "DFY", path: "/dfy" },
          { label: "Demo", path: "/demo" },
          { label: "Contact", path: "/contact" },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.path}
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.55)",
              textDecoration: "none",
              textTransform: "uppercase",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* RIGHT CTAs */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Link
          to="/free-audit"
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            letterSpacing: "0.07em",
            color: "rgba(255,255,255,0.45)",
            textDecoration: "none",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
        >
          Get your free AI audit
        </Link>
        <Link
          to="/login"
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            letterSpacing: "0.05em",
            color: "#fff",
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: "999px",
            padding: "9px 22px",
            transition: "border-color 0.2s, background 0.2s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#fff";
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          Login →
        </Link>
      </div>
    </nav>
  );
}
