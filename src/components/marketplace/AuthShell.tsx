import { Link } from "react-router-dom";

export const NEON = "#caff00";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "24px 32px", borderBottom: "1px solid #1c1c1c" }}>
        <Link to="/" style={{ color: "#fff", textDecoration: "none", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22 }}>
          katexs<span style={{ color: NEON }}>.</span>
        </Link>
      </header>
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>{title}</h1>
          {subtitle && <p style={{ color: "#888", marginBottom: 32, fontSize: 14 }}>{subtitle}</p>}
          <div style={{ background: "#050505", border: "1px solid #1c1c1c", borderRadius: 12, padding: 28 }}>
            {children}
          </div>
          {footer && <div style={{ marginTop: 24, textAlign: "center", color: "#888", fontSize: 13 }}>{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#000",
  border: "1px solid #1c1c1c",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#aaa",
  marginBottom: 6,
  fontFamily: "'Space Mono', monospace",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export const btnNeon: React.CSSProperties = {
  width: "100%",
  background: NEON,
  color: "#000",
  border: "none",
  borderRadius: 999,
  padding: "14px 24px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

export const btnOutline: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  color: "#fff",
  border: "1px solid #2a2a2a",
  borderRadius: 999,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};
