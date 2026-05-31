import { Link } from "react-router-dom";

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f8", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 32px" }}>
        <Link
          to="/"
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "#000",
            textDecoration: "none",
            fontFamily: "Syne, system-ui, sans-serif",
          }}
        >
          katexs<span style={{ color: "#22c55e", fontSize: 20 }}>.</span>
        </Link>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 1080,
            display: "grid",
            gap: 40,
            gridTemplateColumns: "minmax(0, 480px)",
            justifyContent: "center",
            alignItems: "center",
          }}
          className="kx-auth-grid"
        >
          <div style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: "#000", margin: 0, lineHeight: 1.2 }}>{title}</h1>
              {subtitle && <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>{subtitle}</p>}
            </div>
            <div
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: 48,
                boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
              }}
            >
              {children}
            </div>
            {footer && (
              <div style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "#888" }} className="kx-auth-footer">
                {footer}
              </div>
            )}
          </div>

          {/* Decorative right panel — desktop only */}
          <aside className="kx-auth-preview" style={{ display: "none" }}>
            <div
              style={{
                background: "#0a0a0a",
                borderRadius: 20,
                padding: 32,
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              <div style={{ fontFamily: "Syne, system-ui, sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "0.02em" }}>
                katexs<span style={{ color: "#22c55e" }}>.</span>
              </div>

              <div>
                <span
                  style={{
                    display: "inline-block",
                    background: "#fff",
                    color: "#000",
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  River Score 98.9
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { i: "AM", n: "Ava Mitchell", s: "Brand Strategy" },
                  { i: "JR", n: "Julian Reyes", s: "AI Automation" },
                  { i: "SK", n: "Sana Khan", s: "Performance Ads" },
                ].map((e) => (
                  <div
                    key={e.i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "#111",
                      border: "1px solid #1a1a1a",
                      borderRadius: 12,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#1f1f1f",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                      }}
                    >
                      {e.i}
                    </div>
                    <div style={{ flex: 1, color: "#fff", fontSize: 14, fontWeight: 500 }}>{e.n}</div>
                    <span
                      style={{
                        background: "#1f1f1f",
                        color: "#aaa",
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {e.s}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ color: "#fff", fontSize: 16, fontWeight: 500, lineHeight: 1.4 }}>
                The AI freelance marketplace. Built for what's next.
              </div>
              <div style={{ color: "#888", fontSize: 12 }}>Join 2,400+ experts and partners</div>
            </div>
          </aside>
        </div>
      </main>

      <style>{`
        @media (min-width: 1024px) {
          .kx-auth-grid { grid-template-columns: 480px 380px !important; }
          .kx-auth-preview { display: block !important; }
        }
        .kx-auth-footer a { color: #000; font-weight: 500; text-decoration: none; }
        .kx-auth-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
