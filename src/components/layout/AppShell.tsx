import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, ShoppingBag, Wallet, MessageSquare,
  Settings, Search, LogOut, Plus, Bookmark, BadgeCheck, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useOnlineHeartbeat } from "@/hooks/useOnlineHeartbeat";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  useOnlineHeartbeat(!!profile);
  const nav = useNavigate();
  const isSeller = profile?.role === "seller" || profile?.role === "admin";

  const projectsTo = isSeller ? "/seller/orders" : "/buyer/orders";

  const links = [
    { to: "/hq", icon: LayoutDashboard, label: "HQ" },
    { to: projectsTo, icon: ShoppingBag, label: "Projects" },
    { to: "/saved", icon: Bookmark, label: "Saved" },
    { to: "/services", icon: Search, label: "Find experts" },
    ...(isSeller
      ? [
          { to: "/seller/gigs", icon: Package, label: "My services" },
          { to: "/seller/earnings", icon: Wallet, label: "Earnings" },
          { to: "/seller/analytics", icon: BarChart3, label: "Analytics" },
          { to: "/seller/verification", icon: BadgeCheck, label: "Verification" },
        ]
      : []),
  ];
  const shared = [
    { to: "/inbox", icon: MessageSquare, label: "Messages" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const itemCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium tracking-tight transition-colors mx-2 rounded-lg",
      isActive
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">

      <header className="bg-background border-b-hairline sticky top-0 z-40">
        <div className="px-6 h-14 flex items-center gap-6">
          <Link to="/" className="font-mono font-medium text-sm tracking-[0.18em] uppercase">
            KATEXS
          </Link>
          <div className="flex-1" />
          {isSeller && (
            <Button size="sm" onClick={() => nav("/seller/gigs/new")}>
              <Plus className="h-3.5 w-3.5" /> New project
            </Button>
          )}
          <NotificationBell />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-background-elevated border-hairline text-foreground-muted flex items-center justify-center font-mono text-xs">
              {(profile?.full_name?.[0] ?? profile?.email?.[0] ?? "?").toUpperCase()}
            </div>
            <button onClick={signOut} className="text-foreground-subtle hover:text-foreground p-2 transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 bg-background">
        <aside className="w-56 shrink-0 py-4 bg-sidebar border-r border-sidebar-border">
          <nav className="space-y-0.5">
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end className={itemCls}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <div className="my-3 mx-4 h-px bg-sidebar-border" />
            {shared.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={itemCls}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-10 min-w-0 bg-background">{children}</main>
      </div>
      <SiteFooter />
    </div>
  );
}
