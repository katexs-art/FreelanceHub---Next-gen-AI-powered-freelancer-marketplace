import { Bell, LogOut, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";

export function AdminTopbar({ userName, role }: { userName: string; role: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header
      className="h-12 flex items-center justify-between px-4 border-b flex-shrink-0"
      style={{ background: "#08080a", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-[14px] font-semibold text-foreground">Katexs Admin</span>
        <span
          className="text-[10px] font-medium tracking-[0.06em] px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(240,149,149,0.08)",
            color: "#f09595",
            border: "1px solid rgba(240,149,149,0.15)",
          }}
        >
          ADMIN
        </span>
      </div>

      <div className="hidden md:flex items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-secondary" />
          <Input
            placeholder="Search users, clients, affiliates..."
            className="w-[320px] h-8 pl-8 text-[12px] bg-background-elevated border-border"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-1.5 rounded-md hover:bg-background-elevated transition-colors">
          <Bell className="w-4 h-4 text-foreground-secondary" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-foreground">{userName}</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.06em] px-1.5 py-0.5 rounded bg-background-elevated text-foreground-secondary border border-border">
            {role}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="p-1.5 rounded-md hover:bg-background-elevated transition-colors"
        >
          <LogOut className="w-4 h-4 text-foreground-secondary" />
        </button>
      </div>
    </header>
  );
}
