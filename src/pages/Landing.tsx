import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <header className="h-14 border-b border-border flex items-center justify-between px-6">
      <span className="text-h3 font-heading text-foreground tracking-tight">
        Katex<span className="relative">s<span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-accent-green" /></span>
      </span>
      <nav className="flex items-center gap-4">
        <Link to="/pricing" className="text-small text-foreground-secondary hover:text-foreground">Pricing</Link>
        <Link to="/affiliates" className="text-small text-foreground-secondary hover:text-foreground">Affiliates</Link>
        <Link to="/login">
          <Button variant="ghost" size="sm">Log in</Button>
        </Link>
        <Link to="/signup">
          <Button size="sm">Get Started</Button>
        </Link>
      </nav>
    </header>
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-2xl px-6">
        <h1 className="font-heading text-foreground">
          The AI platform for service businesses
        </h1>
        <p className="text-body text-foreground-secondary mt-4 max-w-lg mx-auto">
          Manage contacts, automate workflows, and close more deals — all powered by AI.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/signup">
            <Button size="lg">Start Free Trial</Button>
          </Link>
          <Link to="/pricing">
            <Button variant="ghost" size="lg">View Pricing</Button>
          </Link>
        </div>
      </div>
    </main>
  </div>
);
export default Landing;
