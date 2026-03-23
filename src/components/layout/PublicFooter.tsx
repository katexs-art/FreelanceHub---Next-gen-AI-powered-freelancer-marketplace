import { Link } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer
      className="border-t"
      style={{ background: "hsl(var(--background))", borderColor: "rgba(255,255,255,0.06)", padding: "40px 32px" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-heading font-[800] text-foreground" style={{ fontSize: "16px" }}>
          katexs<span style={{ color: "hsl(var(--accent-green))" }}>.</span>
        </span>
        <div className="flex items-center gap-6">
          {[
            { to: "/features", label: "Features" },
            { to: "/pricing", label: "Pricing" },
            { to: "/integrations-overview", label: "Integrations" },
            { to: "/affiliates", label: "Affiliates" },
            { to: "/wegrow", label: "WeGrow" },
            { to: "/login", label: "Log in" },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="text-foreground-secondary hover:text-foreground" style={{ fontSize: "12px" }}>
              {l.label}
            </Link>
          ))}
        </div>
        <p className="text-foreground-muted" style={{ fontSize: "11px" }}>
          © {new Date().getFullYear()} Katexs. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
