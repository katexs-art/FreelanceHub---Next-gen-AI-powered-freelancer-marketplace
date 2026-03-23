import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/integrations-overview", label: "Integrations" },
  { to: "/affiliates", label: "Affiliates" },
  { to: "/wegrow", label: "WeGrow" },
];

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 transition-all duration-200"
        style={{
          background: scrolled ? "rgba(2,2,3,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        }}
      >
        <Link to="/" className="font-heading font-[800] text-foreground" style={{ fontSize: "18px", letterSpacing: "-0.02em" }}>
          katexs<span style={{ color: "hsl(var(--accent-green))" }}>.</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-5">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="transition-colors"
              style={{
                fontSize: "12px",
                color: pathname === l.to ? "hsl(var(--foreground))" : "hsl(var(--foreground-secondary))",
                borderBottom: pathname === l.to ? "2px solid hsl(var(--foreground))" : "2px solid transparent",
                paddingBottom: "2px",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/signup"><Button size="sm">Start free trial</Button></Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(true)}>
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <Link to="/" className="font-heading font-[800] text-foreground" style={{ fontSize: "18px" }}>
              katexs<span style={{ color: "hsl(var(--accent-green))" }}>.</span>
            </Link>
            <button className="text-foreground" onClick={() => setMobileOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-6">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className="text-foreground font-semibold"
                style={{ fontSize: "20px" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Link to="/login" onClick={() => setMobileOpen(false)}><Button variant="ghost" className="w-full">Sign in</Button></Link>
            <Link to="/signup" onClick={() => setMobileOpen(false)}><Button className="w-full">Start free trial</Button></Link>
          </div>
        </div>
      )}
    </>
  );
}
