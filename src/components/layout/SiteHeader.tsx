import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { Search, Menu, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import katexsLogo from "@/assets/katexs-logo.png";

interface SiteHeaderProps {
  variant?: "default" | "transparent";
}

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const isTransparent = variant === "transparent";

  useEffect(() => {
    if (!isTransparent) return;
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isTransparent]);

  const dashHref =
    profile?.role === "admin" ? "/admin" :
    profile?.role === "seller" ? "/seller/dashboard" : "/buyer/dashboard";

  if (isTransparent) {
    const linkCls = "px-3 py-2 text-white/70 hover:text-white transition-colors";
    return (
      <header
        className="fixed top-0 left-0 right-0 z-[100] transition-[background-color,backdrop-filter] duration-300"
        style={{
          background: "#000",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }}
      >
        <div className="flex items-center gap-6 h-16" style={{ padding: "0 40px" }}>
          <Link to="/" className="flex items-center" style={{ background: "transparent", border: "none", padding: 0 }}>
            <img
              src={katexsLogo}
              alt="KATEXS"
              style={{ height: 36, width: "auto", display: "block", background: "transparent", filter: "invert(1)" }}
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] ml-4">
            <Link to="/explore" className={linkCls}>Browse</Link>
            <Link to="/services" className={linkCls}>Services</Link>
            <Link to="/projects" className={linkCls}>Projects</Link>
            {user && <Link to="/inbox" className={linkCls}>Messages</Link>}
            {user && <Link to="/buyer/orders" className={linkCls}>Orders</Link>}
          </nav>

          <form
            onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`); }}
            className="flex-1 max-w-md relative hidden lg:block"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the catalog…"
              className="w-full h-9 pl-9 pr-24 rounded-full text-sm focus:outline-none text-white placeholder:text-white/40"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
            <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 rounded-full px-3 text-xs bg-white text-black hover:bg-white/90">
              Search <ArrowRight className="h-3 w-3" />
            </Button>
          </form>

          <div className="flex-1 lg:hidden" />

          {user && <RoleSwitcher />}

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link to={dashHref}>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">Dashboard</Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-white border-white/30 bg-transparent hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">Sign in</Button></Link>
                <Link to="/signup"><Button size="sm" className="bg-white text-black hover:bg-white/90">Join</Button></Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2 text-white/70"><Menu className="h-5 w-5" /></button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b-hairline">
      <div className="container-page flex items-center gap-6 h-16">
        <Link to="/" className="flex items-center">
          <img src={katexsLogo} alt="KATEXS" style={{ height: 36, width: "auto", display: "block" }} />
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/explore" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Browse</Link>
          <Link to="/services" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Services</Link>
          {profile?.role !== "seller" && (
            <Link to="/become-a-seller" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Sell</Link>
          )}
          <Link to="/projects" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Projects</Link>
          {user && profile?.role === "client" && (
            <Link to="/post-job" className="px-3 py-2 text-foreground-muted hover:text-foreground transition-colors">Post a Job</Link>
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
