import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background-subtle mt-24">
      <div className="container py-12 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div className="col-span-2">
          <div className="font-heading font-bold text-lg">katexs<span className="text-primary">.</span></div>
          <p className="text-foreground-muted mt-2 text-xs max-w-xs">
            Freelance services for the modern creator economy.
          </p>
        </div>
        <div>
          <div className="font-semibold mb-3">Categories</div>
          <ul className="space-y-2 text-foreground-muted">
            <li><Link to="/explore">Graphics & Design</Link></li>
            <li><Link to="/explore">Programming</Link></li>
            <li><Link to="/explore">Writing</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Support</div>
          <ul className="space-y-2 text-foreground-muted">
            <li><Link to="/help">Help center</Link></li>
            <li><Link to="/trust">Trust & safety</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Company</div>
          <ul className="space-y-2 text-foreground-muted">
            <li><Link to="/about">About</Link></li>
            <li><Link to="/terms">Terms</Link></li>
            <li><Link to="/privacy">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-xs text-foreground-subtle text-center">
        © {new Date().getFullYear()} katexs. All rights reserved.
      </div>
    </footer>
  );
}
