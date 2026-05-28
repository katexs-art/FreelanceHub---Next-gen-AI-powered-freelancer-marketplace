import { Link } from "react-router-dom";
import { C, FONT, MONO, initialsOf } from "@/lib/marketplace/theme";
import type { ExpertRow } from "@/hooks/useExperts";

export function ExpertCard({ e }: { e: ExpertRow }) {
  const name = e.profiles?.full_name || "Anonymous";
  const isTop = (e.rating ?? 0) >= 4.8 || e.featured;
  return (
    <Link
      to={`/expert/${e.id}`}
      style={{
        border: `0.5px solid ${C.border}`,
        borderRadius: 12,
        padding: "1.3rem",
        background: C.card,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.25s",
        textDecoration: "none",
      }}
      onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = C.border2; ev.currentTarget.style.background = C.cardHover; }}
      onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = C.border; ev.currentTarget.style.background = C.card; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.9rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "#111100", border: `1px solid #2a2a00`,
            color: C.neon, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.78rem", fontWeight: 700, fontFamily: FONT,
            overflow: "hidden",
          }}>
            {e.profiles?.avatar_url
              ? <img src={e.profiles.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initialsOf(name)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: C.white, fontSize: "0.82rem", fontWeight: 600, fontFamily: FONT }}>{name}</span>
              {e.tier === "verified" && <i className="ti ti-circle-check-filled" style={{ color: C.neon, fontSize: "0.85rem" }} />}
            </div>
            <div style={{ color: C.gray, fontSize: "0.7rem", fontFamily: FONT }}>{e.specialty || "Expert"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
          <span style={{
            border: isTop ? "1px solid rgba(202,255,0,0.2)" : "1px solid #222",
            color: isTop ? C.neon : C.gray,
            fontSize: "0.6rem", padding: "0.15rem 0.5rem", borderRadius: 999, fontFamily: MONO, letterSpacing: "0.05em"
          }}>{isTop ? "TOP SELLER" : "RISING"}</span>
        </div>
      </div>

      <div style={{ fontSize: "0.83rem", fontWeight: 300, color: "#888", lineHeight: 1.65, marginBottom: "0.85rem", flex: 1, fontFamily: FONT, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {e.bio || "No description yet."}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
        {[
          { icon: "ti-clock", t: e.response_time || "—" },
          { icon: "ti-check", t: `${e.total_jobs ?? 0} done` },
          { icon: "ti-repeat", t: `${e.repeat_rate ?? 0}% repeat` },
        ].map((it, idx) => (
          <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: C.gray, fontSize: "0.68rem", fontFamily: MONO }}>
            <i className={`ti ${it.icon}`} style={{ fontSize: "0.75rem" }} /> {it.t}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.85rem", borderTop: `0.5px solid ${C.border}` }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: C.neon, fontSize: "0.78rem", fontFamily: FONT }}>
          <i className="ti ti-star-filled" /> {Number(e.rating ?? 0).toFixed(1)}
        </div>
        <div style={{ color: C.white, fontSize: "0.85rem", fontFamily: FONT }}>
          <span style={{ color: C.gray, fontSize: "0.65rem", fontFamily: MONO, marginRight: 4 }}>FROM</span>
          ${e.starting_price ?? 0}
        </div>
      </div>
    </Link>
  );
}

export function ExpertCardSkeleton() {
  return (
    <div style={{ border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1.3rem", background: C.card, height: 260 }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0f0f0f", marginBottom: "0.9rem" }} />
      <div style={{ height: 12, background: "#0f0f0f", borderRadius: 4, marginBottom: 8, width: "60%" }} />
      <div style={{ height: 10, background: "#0a0a0a", borderRadius: 4, marginBottom: 6 }} />
      <div style={{ height: 10, background: "#0a0a0a", borderRadius: 4, marginBottom: 6, width: "80%" }} />
    </div>
  );
}
