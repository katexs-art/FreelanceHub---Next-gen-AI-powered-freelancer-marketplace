import { Search, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import katexsLogo from "@/assets/katexs-logo.jpg";

export function TopNav() {
  return (
    <header className="h-12 bg-background-secondary border-b border-border flex items-center px-4 shrink-0">
      <Link to="/" className="flex items-center gap-2 mr-6">
        <img src={katexsLogo} alt="Katexs" className="h-6" />
      </Link>

      <div className="flex-1 flex justify-center max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted" />
          <input
            placeholder="Search..."
            className="w-full h-8 bg-background-elevated border border-border rounded-md pl-9 pr-3 text-small text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-strong"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-6">
        <button className="relative text-foreground-secondary hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
        <div className="h-7 w-7 rounded-full bg-background-elevated border border-border flex items-center justify-center text-small text-foreground-secondary">
          U
        </div>
      </div>
    </header>
  );
}
