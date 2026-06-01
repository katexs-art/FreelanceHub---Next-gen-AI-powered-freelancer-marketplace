import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OtherUser {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_online?: boolean | null;
  last_seen_at?: string | null;
}

interface ProfileExtras {
  location: string | null;
  country: string | null;
  member_since: string | null;
  languages: string[] | null;
  average_rating: number | null;
  total_reviews: number;
  primary_category: string | null;
  last_seen?: string | null;
}

interface RelatedGig {
  id: string;
  title: string;
  thumbnail_url: string | null;
  starting_price: number;
  average_rating: number;
}

function initials(name?: string | null, username?: string | null) {
  return (name?.[0] ?? username?.[0] ?? "?").toUpperCase();
}

function formatMemberSince(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatLastSeen(extra: ProfileExtras | null, other: OtherUser) {
  if (other.is_online) return "Active now";
  const ls = other.last_seen_at || extra?.last_seen;
  if (!ls) return "";
  return `Last seen ${new Date(ls).toLocaleString()}`;
}

export function ConversationDetailsPanel({
  otherUser,
  currentUserId,
}: {
  otherUser: OtherUser;
  conversationId: string;
  currentUserId: string;
}) {
  const nav = useNavigate();
  const [extras, setExtras] = useState<ProfileExtras | null>(null);
  const [gigs, setGigs] = useState<RelatedGig[]>([]);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<string | null>(null);
  const [hoverBtn, setHoverBtn] = useState<string | null>(null);
  const [hoverSeeMore, setHoverSeeMore] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select(
          "location, country, member_since, languages, average_rating, total_reviews, primary_category, last_seen",
        )
        .eq("id", otherUser.id)
        .maybeSingle();
      if (cancel) return;
      setExtras((p as any) ?? null);

      // Related gigs: this seller first
      const { data: own } = await supabase
        .from("gigs")
        .select("id, title, thumbnail_url, starting_price, average_rating")
        .eq("seller_id", otherUser.id)
        .eq("status", "active")
        .order("average_rating", { ascending: false })
        .order("total_orders", { ascending: false })
        .limit(4);
      let list: RelatedGig[] = (own ?? []) as any;

      if (list.length < 4 && (p as any)?.primary_category) {
        const exclude = list.map((g) => g.id);
        const { data: cat } = await supabase
          .from("gigs")
          .select("id, title, thumbnail_url, starting_price, average_rating")
          .eq("category", (p as any).primary_category)
          .eq("status", "active")
          .order("average_rating", { ascending: false })
          .limit(8);
        for (const g of (cat ?? []) as any[]) {
          if (list.length >= 4) break;
          if (!exclude.includes(g.id)) list.push(g);
        }
      }
      if (!cancel) setGigs(list);

      // Completed order between users?
      const { data: ord } = await supabase
        .from("orders")
        .select("id")
        .or(
          `and(buyer_id.eq.${currentUserId},seller_id.eq.${otherUser.id}),and(buyer_id.eq.${otherUser.id},seller_id.eq.${currentUserId})`,
        )
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancel) setReviewOrderId(ord?.id ?? null);
    })();
    return () => {
      cancel = true;
    };
  }, [otherUser.id, currentUserId]);

  const name = otherUser.full_name || otherUser.username || "User";
  const ratingValue = extras?.average_rating ?? 0;
  const ratingDisplay =
    (extras?.total_reviews ?? 0) > 0
      ? `★ ${Number(ratingValue).toFixed(1)} (${extras?.total_reviews})`
      : "No reviews yet";

  const profileHref = otherUser.username ? `/u/${otherUser.username}` : `/seller/${otherUser.id}`;

  return (
    <aside
      style={{
        background: "#FFFFFF",
        borderLeft: "1px solid #EBEBEB",
        overflowY: "auto",
        minHeight: 0,
      }}
    >
      {/* Top — person info */}
      <div style={{ padding: 20, borderBottom: "1px solid #F0F0F0" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "2px solid #EBEBEB",
            background: "#F0F0F0",
            color: "#0A0A0A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 600,
            overflow: "hidden",
          }}
        >
          {otherUser.avatar_url ? (
            <img src={otherUser.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials(otherUser.full_name, otherUser.username)
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginTop: 10 }}>{name}</div>
        {otherUser.username && (
          <div style={{ fontSize: 12, color: "#AAAAAA" }}>@{otherUser.username}</div>
        )}
        <div style={{ fontSize: 12, color: "#AAAAAA", marginBottom: 12 }}>
          {formatLastSeen(extras, otherUser)}
        </div>

        <InfoRow label="From" value={extras?.location || extras?.country || "—"} />
        <InfoRow label="Member Since" value={formatMemberSince(extras?.member_since)} />
        <InfoRow label="Language" value={extras?.languages?.[0] || "—"} />
        <InfoRow label="Rating" value={ratingDisplay} />
      </div>

      {/* Middle — Related Services */}
      <div style={{ padding: 20, borderBottom: "1px solid #F0F0F0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>Related Services</div>
          <Link
            to="/services"
            onMouseEnter={() => setHoverSeeMore(true)}
            onMouseLeave={() => setHoverSeeMore(false)}
            style={{
              fontSize: 12,
              color: hoverSeeMore ? "#0A0A0A" : "#AAAAAA",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            See more →
          </Link>
        </div>

        {gigs.length === 0 ? (
          <div style={{ fontSize: 12, color: "#AAAAAA" }}>No related Services yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gigs.map((g) => {
              const hover = hoverCard === g.id;
              return (
                <a
                  key={g.id}
                  href={`/gig/${g.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setHoverCard(g.id)}
                  onMouseLeave={() => setHoverCard(null)}
                  style={{
                    display: "flex",
                    height: 64,
                    background: "#FFFFFF",
                    border: `1px solid ${hover ? "#CCCCCC" : "#EBEBEB"}`,
                    borderRadius: 10,
                    overflow: "hidden",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "inherit",
                    boxShadow: hover ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      flexShrink: 0,
                      background: "#F5F5F5",
                      overflow: "hidden",
                    }}
                  >
                    {g.thumbnail_url && (
                      <img
                        src={g.thumbnail_url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      padding: "8px 10px",
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#333",
                        lineHeight: 1.3,
                        fontWeight: 500,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {g.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#F59E0B", fontSize: 11 }}>
                        ★ <span style={{ color: "#666" }}>{Number(g.average_rating || 0).toFixed(1)}</span>
                      </span>
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 9, color: "#AAAAAA" }}>FROM</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>
                          ${g.starting_price}
                        </span>
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom — Quick actions */}
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", marginBottom: 12 }}>
          Quick actions
        </div>

        <ActionBtn
          id="profile"
          hover={hoverBtn === "profile"}
          onHover={setHoverBtn}
          onClick={() => nav(profileHref)}
          icon={<Briefcase size={14} color="#888" />}
          label="View their profile"
        />

        {reviewOrderId && (
          <ActionBtn
            id="review"
            hover={hoverBtn === "review"}
            onHover={setHoverBtn}
            onClick={() => nav(`/orders/${reviewOrderId}/review`)}
            icon={<Star size={14} color="#888" />}
            label="Leave a review"
          />
        )}
      </div>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          color: "#AAAAAA",
          letterSpacing: "0.08em",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function ActionBtn({
  id,
  hover,
  onHover,
  onClick,
  icon,
  label,
}: {
  id: string;
  hover: boolean;
  onHover: (v: string | null) => void;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        background: hover ? "#F7F7F7" : "#FFFFFF",
        border: `1px solid ${hover ? "#CCCCCC" : "#EBEBEB"}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.2s",
        marginBottom: 8,
        textAlign: "left",
      }}
    >
      {icon}
      <span style={{ fontSize: 13, color: "#555" }}>{label}</span>
    </button>
  );
}
