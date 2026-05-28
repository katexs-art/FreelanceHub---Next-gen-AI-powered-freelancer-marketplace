import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Search, Menu } from "lucide-react";
import { useState } from "react";

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const dashHref =
    profile?.role === "admin" ? "/admin" :
    profile?.role === "seller" ? "/seller/dashboard" : "/buyer/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="container flex items-center gap-4 h-16">
        <Link to="/" className="font-heading font-bold text-xl tracking-tight">
          katexs<span className="text-primary">.</span>
        </Link>

        <form
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`); }}
          className="flex-1 max-w-2xl relative hidden md:block"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What service are you looking for today?"
            className="w-full h-10 pl-10 pr-4 rounded-full border border-input bg-background-subtle text-sm focus:outline-none focus:border-ring"
          />
        </form>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/explore" className="px-3 py-2 text-foreground hover:text-primary">Explore</Link>
          {profile?.role !== "seller" && (
            <Link to="/become-a-seller" className="px-3 py-2 text-foreground hover:text-primary">Become a seller</Link>
          )}
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
        </nav>

        <button className="md:hidden p-2"><Menu className="h-5 w-5" /></button>
      </div>
    </header>
  );
}
