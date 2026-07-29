import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, ChevronDown, LogOut, User, LayoutDashboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/layout/NotificationBell";

interface SiteHeaderProps {
  variant?: "default" | "transparent";
}

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [profileOpen]);

  const dashHref = profile?.role === "seller" ? "/seller/hq" : "/buyer/hq";
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "";
  const avatarInitial = (profile?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  const isTransparent = variant === "transparent";

  return (
    <header
      className={`z-50 border-b border-white/[0.06] ${
        isTransparent ? "fixed inset-x-0 top-0 bg-[#050505]/80 backdrop-blur-xl" : "sticky top-0 bg-[#0a0a0a]"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <Link to="/" className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-tight text-white">WeGrow</span>
          <span className="text-[9px] tracking-[0.1em] text-white/25">A WeGrow Company</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#how-it-works" className="px-3 py-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white">
            How It Works
          </a>
          <a href="#solutions" className="px-3 py-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white">
            Solutions
          </a>
          <Link to="/services" className="px-3 py-2 text-[13px] font-medium text-white/50 transition-colors hover:text-white">
            For Providers
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />

              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-lg p-1.5"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-sm font-semibold text-white">
                      {avatarInitial}
                    </div>
                  )}
                  <ChevronDown className="h-3 w-3 text-white/40" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/[0.08] bg-[#111] py-1 shadow-xl">
                    <div className="border-b border-white/[0.06] px-4 py-3">
                      <p className="text-sm font-medium text-white">{displayName}</p>
                      <p className="text-[11px] text-white/40">{user.email}</p>
                    </div>
                    <Link to={dashHref} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/60 hover:bg-white/5 hover:text-white">
                      <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                    </Link>
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/60 hover:bg-white/5 hover:text-white">
                      <User className="h-3.5 w-3.5" /> Profile
                    </Link>
                    <div className="mt-1 border-t border-white/[0.06]">
                      <button onClick={() => { setProfileOpen(false); signOut(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10">
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link to="/login" className="hidden text-[13px] font-medium text-white/50 transition-colors hover:text-white sm:block">
                Sign In
              </Link>
              <Link to="/#hero-prompt" className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black transition-all hover:bg-white/90">
                Start a Project
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-white/50 hover:text-white md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-white/[0.06] bg-[#0a0a0a] px-5 pb-6 pt-4 md:hidden">
          <div className="space-y-1">
            <a href="#how-it-works" className="block rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="#solutions" className="block rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>Solutions</a>
            <Link to="/services" className="block rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setMenuOpen(false)}>For Providers</Link>
          </div>
          {!user && (
            <div className="mt-4 flex gap-3">
              <Link to="/login" className="flex-1 rounded-lg border border-white/[0.08] py-2.5 text-center text-sm font-medium text-white/60" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/#hero-prompt" className="flex-1 rounded-lg bg-white py-2.5 text-center text-sm font-semibold text-black" onClick={() => setMenuOpen(false)}>Start a Project</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
