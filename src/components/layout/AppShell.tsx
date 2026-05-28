import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, ShoppingBag, Wallet, MessageSquare,
  Settings, ShoppingCart, Search, LogOut, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const isSeller = profile?.role === "seller" || profile?.role === "admin";

  const sellerLinks = [
    { to: "/seller/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/seller/gigs", icon: Package, label: "My gigs" },
    { to: "/seller/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/seller/earnings", icon: Wallet, label: "Earnings" },
  ];
  const buyerLinks = [
    { to: "/buyer/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/buyer/orders", icon: ShoppingCart, label: "My orders" },
    { to: "/explore", icon: Search, label: "Explore" },
  ];
  const links = isSeller ? sellerLinks : buyerLinks;
  const shared = [
    { to: "/inbox", icon: MessageSquare, label: "Inbox" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background-subtle">
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="px-6 h-16 flex items-center gap-6">
          <Link to="/" className="font-heading font-bold text-xl">
            katexs<span className="text-primary">.</span>
          </Link>
          <div className="flex-1" />
          {isSeller && (
            <Button size="sm" onClick={() => nav("/seller/gigs/new")}>
              <Plus className="h-4 w-4" /> New gig
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
              {(profile?.full_name?.[0] ?? profile?.email?.[0] ?? "?").toUpperCase()}
            </div>
            <button onClick={signOut} className="text-foreground-muted hover:text-foreground p-2">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-60 shrink-0 border-r border-border bg-background min-h-[calc(100vh-4rem)] p-3">
          <nav className="space-y-0.5 text-sm">
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground-muted hover:bg-background-elevated hover:text-foreground"
              )}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <div className="my-3 h-px bg-border" />
            {shared.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground-muted hover:bg-background-elevated hover:text-foreground"
              )}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
