import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { Search, Menu, ArrowRight } from "lucide-react";
import { CategoryBar } from "@/components/layout/CategoryBar";
import { useState } from "react";

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const dashHref =
    profile?.role === "admin" ? "/admin" :
    profile?.role === "seller" ? "/seller/dashboard" : "/buyer/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b-hairline">
      <div className="container-page flex items-center gap-6 h-16">
        <Link to="/" className="font-mono font-medium text-base tracking-[0.18em] uppercase">
          KATEXS
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/explore" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Browse</Link>
          {profile?.role !== "seller" && (
            <Link to="/become-a-seller" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Sell</Link>
          )}
          {user && (
            <>
              <Link to="/inbox" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Messages</Link>
              <Link to="/buyer/orders" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Orders</Link>
            </>
          )}
        </nav>

        <form
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`); }}
          className="flex-1 max-w-md relative hidden lg:block"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the catalog…"
            className="w-full h-9 pl-9 pr-24 rounded-full surface text-sm focus:outline-none focus:border-white/30 transition-colors"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 rounded-full px-3 text-xs"
          >
            Search <ArrowRight className="h-3 w-3" />
          </Button>
        </form>

        <div className="flex-1 lg:hidden" />

        {user && <RoleSwitcher />}

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to={dashHref}><Button variant="ghost" size="sm">Dashboard</Button></Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/signup"><Button size="sm">Join</Button></Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2 text-foreground-muted"><Menu className="h-5 w-5" /></button>
      </div>
    </header>
  );
}
