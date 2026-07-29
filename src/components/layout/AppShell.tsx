import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Home, FolderKanban, MessageSquare, Bot, Users, FileText,
  CreditCard, Settings, Search, Menu, X, Plus, ChevronRight,
  LayoutDashboard, Package, Briefcase, FileQuestion, Wallet,
  Star, CalendarClock, LogOut,
} from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useOnlineHeartbeat } from "@/hooks/useOnlineHeartbeat";

const clientNav = [
  { to: "/buyer/hq", label: "Home", icon: Home, exact: true },
  { to: "/buyer/orders", label: "Projects", icon: FolderKanban },
  { to: "/inbox", label: "Messages", icon: MessageSquare },
  { to: "/find-experts", label: "Experts", icon: Users },
  { to: "/saved", label: "Saved", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

const expertNav = [
  { to: "/seller/hq", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/seller/gigs", label: "My Listings", icon: Package },
  { to: "/seller/orders", label: "Active Projects", icon: FolderKanban },
  { to: "/inbox", label: "Messages", icon: MessageSquare },
  { to: "/seller/earnings", label: "Payouts", icon: Wallet },
  { to: "/seller/analytics", label: "Analytics", icon: Star },
  { to: "/seller/verification", label: "Verification", icon: CalendarClock },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  useOnlineHeartbeat(!!profile);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isExpert = profile?.role === "seller" || profile?.role === "admin";
  const navItems = isExpert ? expertNav : clientNav;
  const roleLabel = isExpert ? "Expert" : "Client";

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "User";
  const avatarInitial = (profile?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "hsl(var(--background-subtle))",
          borderColor: "hsl(var(--border))",
        }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">WeGrow</span>
            {isExpert && (
              <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                Expert
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-white/40 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            className="flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors"
            style={{
              borderColor: "hsl(var(--border))",
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground-muted))",
            }}
          >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd
              className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                background: "hsl(var(--background-elevated))",
                color: "hsl(var(--foreground-muted))",
              }}
            >
              {"⌘"}K
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* CTA */}
        <div className="p-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
          {isExpert ? (
            <div className="rounded-xl p-3" style={{ background: "hsl(142 71% 45% / 0.1)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-sm font-medium text-green-400">Available</span>
              </div>
              <p className="mt-1 text-xs text-white/40">Accepting new projects</p>
            </div>
          ) : (
            <Link
              to="/post-job"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          )}
        </div>

        {/* User */}
        <div className="px-3 py-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: isExpert ? "hsl(217 91% 60% / 0.1)" : "hsl(var(--background-elevated))" }}
              >
                {avatarInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-white/30">{roleLabel}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-1.5 text-white/25 transition-colors hover:text-white/60"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-14 items-center justify-between px-4"
          style={{
            background: "hsl(var(--background-subtle))",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-white/40 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-white lg:hidden">
              WeGrow{isExpert ? " Expert" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
