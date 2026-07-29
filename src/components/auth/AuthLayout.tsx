import { Link } from "react-router-dom";
import { Zap, Shield, Star } from "lucide-react";

function WeGrowLogo({ size = 18, color = "#000" }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color,
        fontFamily: "system-ui, sans-serif",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
      }}
    >
      WeGrow
    </span>
  );
}

const experts = [
  { i: "DA", name: "Diego Alvarez", sub: "Voice AI · GHL", score: "98.9", tint: "#22c55e", avBg: "#1a3a1a", avFg: "#4ade80" },
  { i: "SO", name: "Sarah Okonkwo", sub: "Automation · Zapier", score: "94.2", tint: "#60a5fa", avBg: "#1a1a3a", avFg: "#60a5fa" },
  { i: "TR", name: "Tomas Ribeiro", sub: "Chatbots · Claude", score: "91.7", tint: "#a855f7", avBg: "#2a1a3a", avFg: "#a855f7" },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="kx-auth-shell">
      {/* LEFT — form */}
      <section className="kx-auth-form-col">
        <div className="kx-auth-form-inner">
          <div style={{ marginBottom: 32 }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <WeGrowLogo size={18} color="#000" />
            </Link>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 600, color: "#000", margin: 0, marginBottom: 8, lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 14, color: "#888", margin: 0, marginBottom: 32 }}>{subtitle}</p>
          )}

          {children}

          {footer && (
            <div
              style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "#888" }}
              className="kx-auth-footer"
            >
              {footer}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT — branded panel (desktop only) */}
      <aside className="kx-auth-brand-col">
        <div className="kx-auth-brand-inner">
          {/* TOP */}
          <div>
            <WeGrowLogo size={16} color="#fff" />
            <div style={{ marginTop: 12 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  background: "rgba(34,197,94,0.1)",
                  color: "#22c55e",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 999,
                  padding: "4px 14px",
                }}
              >
                <span style={{ fontSize: 8 }}>●</span> Live — 2,400+ experts online
              </span>
            </div>
          </div>

          {/* MIDDLE */}
          <div>
            <h2
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.3,
                maxWidth: 360,
                margin: "40px 0 32px",
              }}
            >
              Build Anything With AI
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                {
                  Icon: Zap,
                  color: "#22c55e",
                  bg: "rgba(34,197,94,0.15)",
                  text: "AI-powered matching finds the right specialist in seconds",
                },
                {
                  Icon: Shield,
                  color: "#60a5fa",
                  bg: "rgba(59,130,246,0.15)",
                  text: "Secure escrow payments — funds only release when you approve",
                },
                {
                  Icon: Star,
                  color: "#a855f7",
                  bg: "rgba(168,85,247,0.15)",
                  text: "Get paid in 3 days — fastest payouts on any platform",
                },
              ].map(({ Icon, color, bg, text }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: bg,
                      color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.4 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM */}
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {experts.map((e) => (
                <div
                  key={e.i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: e.avBg,
                      color: e.avFg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {e.i}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: "#aaaaaa", marginTop: 2 }}>{e.sub}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      background: `${e.tint}26`,
                      color: e.tint,
                      borderRadius: 999,
                      padding: "2px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Score {e.score}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#aaaaaa", textAlign: "center", marginTop: 8 }}>
              Join them today — it's free
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        .kx-auth-shell {
          min-height: 100vh;
          background: #fff;
          display: flex;
          flex-direction: column;
        }
        .kx-auth-form-col {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          min-height: 100vh;
          background: #fff;
        }
        .kx-auth-form-inner {
          width: 100%;
          max-width: 440px;
        }
        .kx-auth-brand-col { display: none; }
        .kx-auth-footer a { color: #000; font-weight: 600; text-decoration: none; }
        .kx-auth-footer a:hover { text-decoration: underline; }

        @media (min-width: 1024px) {
          .kx-auth-shell {
            flex-direction: row;
          }
          .kx-auth-form-col {
            flex: 1;
            padding: 48px;
          }
          .kx-auth-brand-col {
            display: block;
            flex: 1;
            min-height: 100vh;
            background: linear-gradient(180deg, #0a0a0a 0%, #0d1a0d 100%);
            border-radius: 0 24px 24px 0;
          }
          .kx-auth-brand-inner {
            min-height: 100vh;
            padding: 48px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}
