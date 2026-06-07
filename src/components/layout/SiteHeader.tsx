import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Search, MessageSquare, Heart, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { CategoryBar } from "@/components/layout/CategoryBar";
import katexsLogo from "@/assets/katexs-logo.png";

interface SiteHeaderProps {
  /** "transparent" = fixed dark header used on the Landing page (no category bar).
   *  "default"     = sticky dark header used on all other public pages + category bar. */
  variant?: "default" | "transparent";
  /** Pass false to suppress the category bar even on the default variant. */
  showCategories?: boolean;
}

export function SiteHeader({
  variant = "default",
  showCategories = true,
}: SiteHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── unread message count ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      setUnreadMsgs(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("sh-msgs")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ── close profile dropdown on outside click ───────────────────────────────
  useEffect(() => {
    if (!profileOpen) return;
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [profileOpen]);

  const dashHref =
    profile?.role === "admin" ? "/admin" :
    profile?.role === "seller" ? "/seller/hq" : "/buyer/hq";

  const ordersHref =
    profile?.role === "seller" ? "/seller/orders" : "/buyer/orders";

  const avatarInitial =
    (profile?.full_name?.[0] ?? profile?.email?.[0] ?? "K").toUpperCase();

  const isTransparent = variant === "transparent";

  // ── shared inline styles ──────────────────────────────────────────────────
  const navLink = (base: string = "#888") => ({
    color: base,
    textDecoration: "none" as const,
    fontSize: 14,
    transition: "color 0.15s",
  });

  const iconBtn = {
    position: "relative" as const,
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#888",
    textDecoration: "none" as const,
    transition: "color 0.15s",
  };

  // ── Transparent variant (Landing page) ───────────────────────────────────
  if (isTransparent) {
    return (
      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 100,
          background: "#000",
          borderBottom: "1px solid #1e1e1e",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 64,
            padding: "0 40px",
            maxWidth: 1400,
            margin: "0 auto",
            gap: 16,
          }}
        >
          <Link to="/" style={{ flexShrink: 0 }}>
            <img
              src={katexsLogo}
              alt="KATEXS"
              style={{ height: 20, width: "auto", filter: "invert(1) brightness(2)" }}
            />
          </Link>

          <nav style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {[
              { to: "/services",    label: "Find Experts" },
              { to: "/projects",    label: "Open Projects" },
              { to: "/how-it-works", label: "How It Works" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                style={{ ...navLink(), padding: "8px 12px", borderRadius: 6 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#888"; }}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link to={dashHref}
                style={{ ...navLink("#ccc"), padding: "8px 14px", borderRadius: 6, fontWeight: 500 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#ccc"; }}>
                Dashboard
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link to="/login"
                style={{ ...navLink(), padding: "8px 14px", borderRadius: 6 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#888"; }}>
                Sign In
              </Link>
              <Link to="/signup"
                style={{
                  padding: "8px 20px", fontSize: 14, fontWeight: 600,
                  color: "#fff", background: "#16A34A",
                  textDecoration: "none", borderRadius: 6,
                }}>
                Join Free
              </Link>
            </div>
          )}
        </div>
      </header>
    );
  }

  // ── Default variant (all public marketplace pages) ────────────────────────
  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#0a0a0a",
          borderBottom: "1px solid #1e1e1e",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 64,
            padding: "0 24px",
            maxWidth: 1400,
            margin: "0 auto",
            gap: 12,
          }}
        >
          {/* Logo */}
          <Link to="/" style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <img
              src={katexsLogo}
              alt="KATEXS"
              style={{ height: 20, width: "auto", filter: "invert(1) brightness(2)" }}
            />
          </Link>

          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate(`/services?q=${encodeURIComponent(q)}`);
            }}
            style={{ flex: 1, maxWidth: 560 }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute", left: 14, top: "50%",
                  transform: "translateY(-50%)",
                  color: "#888", pointerEvents: "none",
                }}
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What service are you looking for today?"
                style={{
                  width: "100%", height: 40,
                  paddingLeft: 42, paddingRight: 76,
                  borderRadius: 6,
                  border: "1px solid #333",
                  background: "#111111",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#555"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#333"; }}
              />
              <button
                type="submit"
                style={{
                  position: "absolute", right: 0, top: 0, bottom: 0,
                  background: "#16A34A", color: "#fff",
                  border: "none",
                  borderRadius: "0 6px 6px 0",
                  padding: "0 16px",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#15803d"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#16A34A"; }}
              >
                Search
              </button>
            </div>
          </form>

          <div style={{ flex: 1 }} />

          {/* ── Logged-in right section ─── */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>

              {/* Notification bell (existing component) */}
              <NotificationBell />

              {/* Messages */}
              <Link
                to="/inbox"
                title="Messages"
                style={{ ...iconBtn }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#888"; }}
              >
                <MessageSquare size={18} />
                {unreadMsgs > 0 && (
                  <span style={{
                    position: "absolute", top: 2, right: 2,
                    minWidth: 16, height: 16, padding: "0 3px",
                    borderRadius: 999,
                    background: "#16A34A", color: "#fff",
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {unreadMsgs > 9 ? "9+" : unreadMsgs}
                  </span>
                )}
              </Link>

              {/* Saved/Favorites */}
              <Link
                to="/saved"
                title="Saved"
                style={{ ...iconBtn }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#888"; }}
              >
                <Heart size={18} />
              </Link>

              {/* Orders button */}
              <Link
                to={ordersHref}
                style={{
                  display: "flex", alignItems: "center",
                  height: 36, padding: "0 14px",
                  borderRadius: 6,
                  border: "1px solid #333",
                  color: "#ffffff",
                  fontSize: 13, fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "border-color 0.15s",
                  marginLeft: 4,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#555"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#333"; }}
              >
                Orders
              </Link>

              {/* Avatar + dropdown */}
              <div ref={profileRef} style={{ position: "relative", marginLeft: 4 }}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "transparent", border: "none",
                    cursor: "pointer", padding: "4px 6px", borderRadius: 8,
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#16A34A", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, overflow: "hidden", flexShrink: 0,
                  }}>
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : avatarInitial}
                  </div>
                  <ChevronDown
                    size={14}
                    style={{
                      color: "#888",
                      transform: profileOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {profileOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: "#111111", border: "1px solid #1e1e1e",
                    borderRadius: 12, padding: "8px 0", minWidth: 210,
                    zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                  }}>
                    {/* User info */}
                    <div style={{ padding: "10px 16px 12px", borderBottom: "1px solid #1e1e1e" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                        {profile?.full_name ?? profile?.email ?? "User"}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {profile?.role === "seller" ? "Expert" :
                         profile?.role === "admin" ? "Admin" : "Partner"}
                      </div>
                    </div>

                    {[
                      { label: "Dashboard",  to: dashHref },
                      { label: "Orders",     to: ordersHref },
                      { label: "Inbox",      to: "/inbox" },
                      { label: "Saved",      to: "/saved" },
                      { label: "Settings",   to: "/settings" },
                    ].map(({ label, to }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setProfileOpen(false)}
                        style={{ display: "block", padding: "9px 16px", fontSize: 14, color: "#ccc", textDecoration: "none" }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.background = "#1a1a1a"; el.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.background = "transparent"; el.style.color = "#ccc";
                        }}
                      >
                        {label}
                      </Link>
                    ))}

                    <div style={{ height: 1, background: "#1e1e1e", margin: "4px 0" }} />

                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); signOut(); }}
                      style={{
                        width: "100%", textAlign: "left", background: "transparent",
                        border: "none", padding: "9px 16px", fontSize: 14,
                        color: "#888", cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.background = "#1a1a1a"; el.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.background = "transparent"; el.style.color = "#888";
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* ── Logged-out right section ─── */
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                to="/login"
                style={{ ...navLink(), padding: "8px 14px", borderRadius: 6 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#888"; }}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                style={{
                  padding: "8px 20px", fontSize: 14, fontWeight: 600,
                  color: "#fff", background: "#16A34A",
                  textDecoration: "none", borderRadius: 6,
                }}
              >
                Join Free
              </Link>
            </div>
          )}

          {/* ── Mobile hamburger ─── */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            style={{
              display: "none", // shown via @media below
              background: "transparent", border: "none",
              color: "#888", cursor: "pointer", padding: 6,
            }}
            className="kx-hamburger"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ── Mobile menu ─── */}
        {mobileOpen && (
          <div style={{ background: "#111111", borderTop: "1px solid #1e1e1e", padding: "16px 24px 20px" }}>
            {user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { to: dashHref,   label: "Dashboard" },
                  { to: ordersHref, label: "Orders" },
                  { to: "/inbox",   label: "Messages" },
                  { to: "/saved",   label: "Saved" },
                  { to: "/settings", label: "Settings" },
                  { to: "/services", label: "Find Experts" },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                    style={{ padding: "10px 0", fontSize: 15, color: "#ccc", textDecoration: "none", borderBottom: "1px solid #1a1a1a" }}>
                    {label}
                  </Link>
                ))}
                <button type="button" onClick={() => { setMobileOpen(false); signOut(); }}
                  style={{ textAlign: "left", background: "transparent", border: "none", padding: "10px 0", fontSize: 15, color: "#888", cursor: "pointer", marginTop: 4 }}>
                  Sign out
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { to: "/services",    label: "Find Experts" },
                  { to: "/projects",    label: "Open Projects" },
                  { to: "/how-it-works", label: "How It Works" },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                    style={{ fontSize: 15, color: "#ccc", textDecoration: "none" }}>
                    {label}
                  </Link>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Link to="/login" onClick={() => setMobileOpen(false)}
                    style={{ flex: 1, textAlign: "center", padding: "10px 0", fontSize: 14, color: "#fff", border: "1px solid #333", borderRadius: 6, textDecoration: "none" }}>
                    Sign In
                  </Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}
                    style={{ flex: 1, textAlign: "center", padding: "10px 0", fontSize: 14, fontWeight: 600, color: "#fff", background: "#16A34A", borderRadius: 6, textDecoration: "none" }}>
                    Join Free
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <style>{`
          @media (max-width: 768px) {
            .kx-hamburger { display: flex !important; }
          }
        `}</style>
      </header>

      {/* Category bar — sticky just below the header */}
      {showCategories && <CategoryBar />}
    </>
  );
}
