import { Link } from "react-router-dom";
import { ShieldCheck, CreditCard, RotateCcw } from "lucide-react";
import katexsLogoWhite from "@/assets/katexs-logo-white.jpg";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.525.02c1.8-.1 3.5.7 4.5 2.3 1.1 1.6 1.3 3.6.6 5.3h.1v-1.2c.8.3 1.6.6 2.4.7V5.2c-.7-.1-1.4-.4-2-.8-.6-.4-1.1-1-1.4-1.6-.3-.7-.4-1.4-.3-2.1-.1 0-.2 0-.3.1-1.4.6-2.6 1.7-3.3 3.1-.7 1.4-.9 3-.6 4.5.3 1.5 1.1 2.9 2.2 3.9 1.1 1 2.5 1.6 4 1.7-.1-.8-.2-1.6-.2-2.4 0-1.6.6-3.1 1.7-4.2 1.1-1.1 2.6-1.7 4.2-1.7.1 0 .2 0 .3.1V.02z" />
    </svg>
  );
}

const BUYER_LINKS = [
  { label: "Find Experts", href: "/services" },
  { label: "Post a Project", href: "/post-job" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const SELLER_LINKS = [
  { label: "Become an Expert", href: "/seller-onboarding" },
  { label: "Expert Dashboard", href: "/seller/dashboard" },
  { label: "Earnings", href: "/seller/earnings" },
  { label: "Verification", href: "/seller/verification" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Careers", href: "/careers" },
  { label: "Press", href: "/press" },
];

const SUPPORT_LINKS = [
  { label: "Help Center", href: "/help" },
  { label: "Contact Us", href: "/contact" },
  { label: "Trust & Safety", href: "/trust" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

const SOCIALS = [
  { label: "Twitter / X", href: "https://twitter.com/katexs", Icon: XIcon },
  { label: "LinkedIn", href: "https://linkedin.com/company/katexs", Icon: LinkedInIcon },
  { label: "Instagram", href: "https://instagram.com/katexs", Icon: InstagramIcon },
  { label: "TikTok", href: "https://tiktok.com/@katexs", Icon: TikTokIcon },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-[#1a1a1a]">
      {/* Main footer content */}
      <div className="container-page py-16 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Left — Brand */}
          <div className="lg:col-span-3">
            <Link to="/" className="inline-block">
              <img
                src={katexsLogoWhite}
                alt="KATEXS"
                className="h-5 w-auto"
                style={{ display: "block" }}
              />
            </Link>
            <p className="mt-4 text-sm text-[#888] leading-relaxed max-w-xs">
              The AI platform built for the next decade of work.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-[#666] hover:text-white transition-colors"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Middle — For Buyers */}
          <div className="lg:col-span-2">
            <h4 className="text-white text-sm font-semibold mb-4">For Partners</h4>
            <ul className="space-y-3">
              {BUYER_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link to={href} className="text-[#888] text-sm hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Middle — For Sellers */}
          <div className="lg:col-span-2">
            <h4 className="text-white text-sm font-semibold mb-4">For Experts</h4>
            <ul className="space-y-3">
              {SELLER_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link to={href} className="text-[#888] text-sm hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Middle — Company */}
          <div className="lg:col-span-2">
            <h4 className="text-white text-sm font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link to={href} className="text-[#888] text-sm hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — Support */}
          <div className="lg:col-span-3">
            <h4 className="text-white text-sm font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              {SUPPORT_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link to={href} className="text-[#888] text-sm hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1a1a1a]">
        <div className="container-page py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 flex-wrap">
            {/* Copyright */}
            <p className="text-[#666] text-xs whitespace-nowrap">
              © 2026 Katexs. All rights reserved.
            </p>

            {/* Trust badges */}
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <div className="flex items-center gap-2 text-[#666]">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">SSL Secured</span>
              </div>
              <div className="flex items-center gap-2 text-[#666]">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Stripe Payments</span>
              </div>
              <div className="flex items-center gap-2 text-[#666]">
                <RotateCcw className="h-4 w-4" />
                <span className="text-xs whitespace-nowrap">Money-back Guarantee</span>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-[#666] text-xs whitespace-nowrap">
              Built with AI. Powered by humans.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
