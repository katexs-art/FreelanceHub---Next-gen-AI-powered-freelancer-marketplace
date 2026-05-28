import { Link } from "react-router-dom";
import { Eyebrow } from "@/components/ui/mono";

export function SiteFooter() {
  return (
    <footer className="border-t-hairline bg-background">
      <div className="container-page py-20 grid grid-cols-2 md:grid-cols-5 gap-12 text-sm">
        <div className="col-span-2">
          <div className="font-mono uppercase tracking-[0.18em] text-base">KATEXS</div>
          <p className="text-foreground-muted mt-4 text-xs max-w-xs leading-relaxed">
            A precision freelance marketplace, engineered for the next decade of work.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 mono-tag">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            ALL SYSTEMS NOMINAL
          </div>
        </div>

        {[
          { h: "CATALOG", items: [["Browse", "/explore"], ["Categories", "/explore"], ["AI services", "/explore"]] },
          { h: "SELLERS", items: [["Become a seller", "/become-a-seller"], ["Seller dashboard", "/seller/dashboard"], ["Earnings", "/seller/earnings"]] },
          { h: "COMPANY", items: [["About", "/about"], ["Trust & safety", "/trust"], ["Terms", "/terms"], ["Privacy", "/privacy"]] },
        ].map((col) => (
          <div key={col.h}>
            <Eyebrow>{col.h}</Eyebrow>
            <ul className="space-y-3 text-foreground-muted mt-5">
              {col.items.map(([l, h]) => (
                <li key={l}><Link to={h} className="hover:text-foreground transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t-hairline py-6">
        <div className="container-page flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="font-mono uppercase tracking-[0.14em] text-foreground-subtle">
            © {new Date().getFullYear()} KATEXS LABS · ALL RIGHTS RESERVED
          </div>
          <div className="font-mono uppercase tracking-[0.14em] text-foreground-subtle">
            BUILT IN PUBLIC · V1.0.0
          </div>
        </div>
      </div>
    </footer>
  );
}
