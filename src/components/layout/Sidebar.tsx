import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  Users,
  GitBranch,
  Workflow,
  Plug,
  MessageSquare,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Inbox, label: "Inbox", to: "/inbox" },
  { icon: Users, label: "Contacts", to: "/contacts" },
  { icon: GitBranch, label: "Pipeline", to: "/pipeline" },
  { icon: Workflow, label: "Workflows", to: "/workflows" },
  { icon: Plug, label: "Integrations", to: "/integrations" },
  { icon: MessageSquare, label: "Messenger", to: "/messenger" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={cn(
        "h-full bg-background-secondary border-r border-border flex flex-col shrink-0 transition-all duration-200",
        expanded ? "w-[220px]" : "w-14"
      )}
    >
      <div className="flex-1 py-2 flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 h-10 px-4 text-small transition-colors",
                isActive
                  ? "text-foreground bg-background-elevated"
                  : "text-foreground-secondary hover:text-foreground hover:bg-background-elevated/50"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {expanded && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </div>

      <div className="border-t border-border py-2">
        <NavLink
          to="#"
          className="flex items-center gap-3 h-10 px-4 text-small text-foreground-secondary hover:text-foreground"
        >
          <div className="relative">
            <Sparkles className="h-4 w-4 shrink-0 text-accent-purple" />
            <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent-purple" />
          </div>
          {expanded && <span className="text-accent-purple">River AI</span>}
        </NavLink>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 h-8 px-4 text-foreground-muted hover:text-foreground-secondary w-full"
        >
          {expanded ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          {expanded && <span className="text-small">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
