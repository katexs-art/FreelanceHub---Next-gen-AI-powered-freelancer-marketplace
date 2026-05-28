import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (profile?.role !== "seller" && profile?.role !== "admin") return null;

  const isSelling =
    location.pathname.startsWith("/seller") || location.pathname.startsWith("/admin");

  const base =
    "px-4 py-1.5 rounded-full text-xs font-medium transition-colors";

  return (
    <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-background-elevated border-hairline">
      <button
        onClick={() => navigate("/buyer/dashboard")}
        className={cn(base, !isSelling ? "bg-primary text-primary-foreground" : "text-foreground-muted hover:text-foreground")}
      >
        Buying
      </button>
      <button
        onClick={() => navigate("/seller/dashboard")}
        className={cn(base, isSelling ? "bg-primary text-primary-foreground" : "text-foreground-muted hover:text-foreground")}
      >
        Selling
      </button>
    </div>
  );
}
