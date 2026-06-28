import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={{
      background: "#000",
      borderTop: "0.5px solid rgba(255,255,255,0.08)",
      padding: "80px 40px 40px",
    }}>

      {/* BIG LOGO WATERMARK — centered, very large, low opacity */}
      <div style={{
        textAlign: "center",
        marginBottom: "72px",
        overflow: "hidden",
      }}>
        <img
          src="/Katexs_Logo_White.jpg"
          alt="Katexs"
          style={{
            width: "clamp(280px, 55vw, 680px)",
            height: "auto",
            objectFit: "contain",
            opacity: 0.06,
            display: "block",
            margin: "0 auto",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* FOOTER MAIN ROW */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "40px",
        flexWrap: "wrap",
        marginBottom: "48px",
        paddingBottom: "48px",
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
      }}>

        {/* LEFT — real logo + tagline */}
        <div style={{ maxWidth: "280px" }}>
          <Link to="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: "16px" }}>
            <img
              src="/Katexs_Logo_White.jpg"
              alt="Katexs"
              style={{
                height: "36px",
                width: "auto",
                objectFit: "contain",
              }}
            />
          </Link>
          <p style={{
            fontFamily: "monospace",
            fontSize: "12px",
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.75,
            margin: 0,
          }}>
            The autonomous AI platform for service businesses. Deploy AI agents. Run your business on autopilot.
          </p>
        </div>

        {/* MIDDLE — nav columns */}
        <div style={{ display: "flex", gap: "56px", flexWrap: "wrap" }}>
          <div>
            <p style={{
              fontFamily: "monospace",
              fontSize: "10px",
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              marginBottom: "16px",
              marginTop: 0,
            }}>
              Platform
            </p>
            {["Services", "Benefits", "Pricing", "Results"].map((item) => (
              <div key={item} style={{ marginBottom: "12px" }}>
                <Link
                  to={`/#${item.toLowerCase()}`}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.45)",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                >
                  {item}
                </Link>
              </div>
            ))}
          </div>

          <div>
            <p style={{
              fontFamily: "monospace",
              fontSize: "10px",
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              marginBottom: "16px",
              marginTop: 0,
            }}>
              Company
            </p>
            {[
              { label: "Demo", path: "/demo" },
              { label: "DFY", path: "/dfy" },
              { label: "Contact", path: "/contact" },
              { label: "Free Audit", path: "/free-audit" },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: "12px" }}>
                <Link
                  to={item.path}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.45)",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                >
                  {item.label}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — newsletter */}
        <div style={{ maxWidth: "260px" }}>
          <p style={{
            fontFamily: "monospace",
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.25)",
            textTransform: "uppercase",
            marginBottom: "12px",
            marginTop: 0,
          }}>
            Stay updated
          </p>
          <p style={{
            fontFamily: "monospace",
            fontSize: "12px",
            color: "rgba(255,255,255,0.35)",
            marginBottom: "16px",
            lineHeight: 1.65,
            marginTop: 0,
          }}>
            Monthly notes on deploying AI in your business — without the technical overwhelm.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              placeholder="your@email.com"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "0.5px solid rgba(255,255,255,0.15)",
                borderRadius: "6px",
                padding: "10px 12px",
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#fff",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button style={{
              background: "#fff",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              padding: "10px 14px",
              fontFamily: "monospace",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              Join →
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER BOTTOM BAR */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
      }}>
        <p style={{
          fontFamily: "monospace",
          fontSize: "11px",
          color: "rgba(255,255,255,0.2)",
          margin: 0,
        }}>
          © 2026 Katexs AI · All rights reserved
        </p>
        <div style={{ display: "flex", gap: "20px" }}>
          {["Privacy Policy", "Terms of Service", "Contact"].map((item) => (
            <Link
              key={item}
              to="#"
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                color: "rgba(255,255,255,0.2)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
            >
              {item}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
