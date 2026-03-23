import { useState, useEffect, useRef } from "react";
import { Search, Bell, LogOut, Settings, CreditCard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import katexsLogo from "@/assets/katexs-logo.jpg";

export function TopNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const notifsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setActivities(data || []));
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user?.email?.[0]?.toUpperCase() || "U";

  function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  }

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
        {/* Notifications */}
        <div className="relative" ref={notifsRef}>
          <button
            className="relative text-foreground-secondary hover:text-foreground"
            onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); }}
          >
            <Bell className="h-4 w-4" />
            {activities.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-green" />
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-background-card border border-border rounded-[10px] overflow-hidden z-50">
              <div className="p-3 border-b border-border">
                <p className="text-small font-medium text-foreground">Notifications</p>
              </div>
              {activities.length === 0 ? (
                <p className="p-4 text-small text-foreground-secondary text-center">No recent activity</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="px-3 py-2.5 border-b border-border last:border-0 hover:bg-background-elevated/50">
                    <p className="text-small text-foreground-secondary truncate">{a.description || `${a.type} activity`}</p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">{timeAgo(a.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
            className="h-7 w-7 rounded-full bg-background-elevated border border-border flex items-center justify-center text-small text-foreground-secondary hover:text-foreground"
          >
            {initials}
          </button>
          {showUser && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-background-card border border-border rounded-[10px] overflow-hidden z-50">
              <Link to="/settings" onClick={() => setShowUser(false)} className="flex items-center gap-2 px-3 py-2.5 text-small text-foreground-secondary hover:bg-background-elevated/50 hover:text-foreground">
                <Settings className="w-3.5 h-3.5" /> Account settings
              </Link>
              <Link to="/settings" onClick={() => setShowUser(false)} className="flex items-center gap-2 px-3 py-2.5 text-small text-foreground-secondary hover:bg-background-elevated/50 hover:text-foreground border-t border-border">
                <CreditCard className="w-3.5 h-3.5" /> Billing
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2.5 text-small text-[#f09595] hover:bg-background-elevated/50 border-t border-border w-full text-left"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
