import { Link } from "react-router-dom";

const links = {
  "For Clients": [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Case Studies", href: "/case-studies" },
    { label: "Support", href: "/support" },
  ],
  "For Providers": [
    { label: "Join as Expert", href: "/join" },
    { label: "Expert OS", href: "/expert-os" },
    { label: "Payouts", href: "/expert-payouts" },
    { label: "Guidelines", href: "/guidelines" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#050505]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex flex-col">
              <span className="text-[15px] font-semibold tracking-tight text-white">WeGrow</span>
              <span className="text-[10px] tracking-wide text-white/30">A WeGrow Company</span>
            </Link>
            <p className="mt-4 text-[13px] leading-relaxed text-white/30">
              Describe what you need. WeGrow creates the plan, recommends the right delivery option, and manages the work in one operating system.
            </p>
          </div>
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h3 className="text-[11px] font-medium uppercase tracking-widest text-white/20">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link to={item.href} className="text-[13px] text-white/40 transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-[12px] text-white/20">&copy; {new Date().getFullYear()} WeGrow. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            <Link to="/privacy" className="text-[12px] text-white/20 hover:text-white/50">Privacy</Link>
            <Link to="/terms" className="text-[12px] text-white/20 hover:text-white/50">Terms</Link>
            <Link to="/cookies" className="text-[12px] text-white/20 hover:text-white/50">Cookie Settings</Link>
            <Link to="/accessibility" className="text-[12px] text-white/20 hover:text-white/50">Accessibility</Link>
            <Link to="/login" className="text-[12px] text-white/20 hover:text-white/50">Sign In</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
