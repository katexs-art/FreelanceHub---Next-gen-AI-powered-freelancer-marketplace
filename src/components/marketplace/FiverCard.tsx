import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Level badge ────────────────────────────────────────────────────────────
export function expertLevel(totalReviews: number, avgRating: number) {
  if (avgRating >= 4.7 && totalReviews >= 200) return "Top Rated";
  if (totalReviews >= 50) return "Level 2";
  if (totalReviews >= 10) return "Level 1";
  return null; // "New" — no badge shown
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  "Top Rated": { bg: "#7C3AED", color: "#fff" },
  "Level 2":   { bg: "#16A34A", color: "#fff" },
  "Level 1":   { bg: "#0EA5E9", color: "#fff" },
};

export interface FiverCardData {
  id: string;
  title: string;
  thumbnail_url: string | null;
  starting_price: number;
  average_rating: number;
  total_reviews: number;
  seller?: {
    id?: string | null;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    total_reviews?: number;
  } | null;
}

// ── Heart / save button (inline dark version) ─────────────────────────────
function HeartBtn({ gigId }: { gigId: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [saved, setSaved] = useState(false);
  const [checked, setChecked] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return nav("/login");
    if (!checked) {
      const { data } = await supabase
        .from("saved_gigs").select("id").eq("user_id", user.id).eq("gig_id", gigId).maybeSingle();
      const isSaved = !!data;
      setChecked(true);
      setSaved(isSaved);
      if (isSaved) {
        await supabase.from("saved_gigs").delete().eq("user_id", user.id).eq("gig_id", gigId);
        setSaved(false);
      } else {
        const { error } = await supabase.from("saved_gigs").insert({ user_id: user.id, gig_id: gigId });
        if (!error) setSaved(true);
      }
    } else {
      if (saved) {
        await supabase.from("saved_gigs").delete().eq("user_id", user.id).eq("gig_id", gigId);
        setSaved(false);
      } else {
        const { error } = await supabase.from("saved_gigs").insert({ user_id: user.id, gig_id: gigId });
        if (!error) setSaved(true);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? "Unsave" : "Save"}
      style={{
        position: "absolute", top: 10, right: 10,
        width: 32, height: 32, borderRadius: "50%",
        background: "rgba(0,0,0,0.55)",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
        transition: "background 0.15s",
      }}
    >
      <Heart
        size={16}
        style={{
          color: saved ? "#ef4444" : "#fff",
          fill: saved ? "#ef4444" : "none",
          transition: "color 0.15s, fill 0.15s",
        }}
      />
    </button>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────
export function FiverCard({ gig }: { gig: FiverCardData }) {
  const sellerName = gig.seller?.full_name ?? gig.seller?.username ?? "Expert";
  const initial = sellerName[0]?.toUpperCase() ?? "E";
  const sellerReviews = gig.seller?.total_reviews ?? gig.total_reviews;
  const level = expertLevel(sellerReviews, gig.average_rating);

  return (
    <Link
      to={`/gig/${gig.id}`}
      style={{
        display: "block",
        background: "#111111",
        border: "1px solid #1e1e1e",
        borderRadius: 12,
        overflow: "hidden",
        textDecoration: "none",
        transition: "transform 0.18s, box-shadow 0.18s",
        cursor: "pointer",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "none";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", background: "#1a1a1a" }}>
        {gig.thumbnail_url ? (
          <img
            src={gig.thumbnail_url}
            alt={gig.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            No image
          </div>
        )}
        <HeartBtn gigId={gig.id} />
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px 14px" }}>
        {/* Seller row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#1a1a1a", color: "#888",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: "hidden",
          }}>
            {gig.seller?.avatar_url ? (
              <img
                src={gig.seller.avatar_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : initial}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#cccccc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sellerName}
          </span>
          {level && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: "2px 7px", borderRadius: 999,
              background: LEVEL_STYLE[level]?.bg ?? "#333",
              color: LEVEL_STYLE[level]?.color ?? "#fff",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {level}
            </span>
          )}
        </div>

        {/* Title */}
        <p style={{
          fontSize: 13, lineHeight: 1.5, color: "#e0e0e0",
          margin: "0 0 10px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as any,
          overflow: "hidden",
          minHeight: 40,
        }}>
          {gig.title}
        </p>

        {/* Rating */}
        {gig.total_reviews > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <Star size={12} style={{ fill: "#F59E0B", color: "#F59E0B" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>
              {Number(gig.average_rating).toFixed(1)}
            </span>
            <span style={{ fontSize: 11, color: "#888" }}>({gig.total_reviews})</span>
          </div>
        )}

        {/* Price */}
        <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: 10, marginTop: gig.total_reviews > 0 ? 0 : 8 }}>
          <span style={{ fontSize: 11, color: "#888" }}>Starting from </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>${gig.starting_price}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────
export function FiverCardSkeleton() {
  return (
    <div style={{
      background: "#111111", border: "1px solid #1e1e1e",
      borderRadius: 12, overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{ aspectRatio: "16/10", background: "#1a1a1a" }} />
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a" }} />
          <div style={{ height: 10, width: "50%", background: "#1a1a1a", borderRadius: 6 }} />
        </div>
        <div style={{ height: 10, background: "#1a1a1a", borderRadius: 6, marginBottom: 6 }} />
        <div style={{ height: 10, background: "#1a1a1a", borderRadius: 6, width: "70%", marginBottom: 12 }} />
        <div style={{ height: 14, background: "#1a1a1a", borderRadius: 6, width: "40%" }} />
      </div>
    </div>
  );
}
