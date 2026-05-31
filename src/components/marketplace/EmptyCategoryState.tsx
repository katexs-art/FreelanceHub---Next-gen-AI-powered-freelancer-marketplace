import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

interface Props {
  surface?: "light" | "dark";
  heading?: string;
  subtext?: string;
}

export function EmptyCategoryState({
  surface = "light",
  heading = "No experts in this category yet",
  subtext = "Be the first expert in this category and get early access to all partner requests — zero competition.",
}: Props) {
  const dark = surface === "dark";
  const bg = dark ? "#0a0a0a" : "#ffffff";
  const iconColor = dark ? "#333333" : "#e5e5e5";
  const headingColor = dark ? "#ffffff" : "#000000";
  const subtextColor = dark ? "#888888" : "#666666";

  const primaryBtn: React.CSSProperties = {
    background: dark ? "#ffffff" : "#000000",
    color: dark ? "#000000" : "#ffffff",
    borderRadius: 999,
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    border: "none",
    display: "inline-block",
  };
  const outlineBtn: React.CSSProperties = {
    background: "transparent",
    color: dark ? "#888888" : "#000000",
    border: dark ? "1px solid #555555" : "1px solid #000000",
    borderRadius: 999,
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    display: "inline-block",
    transition: "border-color 0.15s, color 0.15s",
  };
  const outlineHoverClass = dark ? "ecs-outline-dark" : "ecs-outline-light";

  return (
    <div style={{ background: bg, width: "100%" }}>
      <style>{`
        .ecs-outline-dark:hover { border-color: #ffffff !important; color: #ffffff !important; }
        .ecs-outline-light:hover { background: #000 !important; color: #fff !important; }
      `}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: `2px solid ${iconColor}`,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
          aria-hidden
        >
          <Plus size={28} strokeWidth={2} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: headingColor, marginBottom: 12 }}>
          {heading}
        </div>
        <div style={{ fontSize: 14, color: subtextColor, lineHeight: 1.6, marginBottom: 32 }}>
          {subtext}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <Link to="/sign-up" style={primaryBtn}>Apply as an Expert</Link>
          <Link to="/services" className={outlineHoverClass} style={outlineBtn}>Browse all experts</Link>
        </div>
        <div style={{ fontSize: 12, color: "#bbbbbb" }}>
          Free to apply · Approved within 24 hours · Start earning immediately.
        </div>
      </div>
    </div>
  );
}
