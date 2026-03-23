import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BarChart3, Radio,
  Users, Clock, CreditCard, UserX,
  DollarSign, Receipt, RotateCcw, Coins,
  Zap, Plug, FileCode, Webhook,
  Headphones, MessageSquare, Lightbulb,
  UserCog, Shield, Activity,
  Settings, Mail, Tag, Bot,
} from "lucide-react";

const sections = [
  {
    label: "OVERVIEW",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/admin/monitor", icon: Radio, label: "Real-time monitor" },
    ],
  },
  {
    label: "CLIENTS",
    items: [
      { to: "/admin/clients", icon: Users, label: "All clients" },
      { to: "/admin/trials", icon: Clock, label: "Active trials" },
      { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
      { to: "/admin/churned", icon: UserX, label: "Churned" },
    ],
  },
  {
    label: "REVENUE",
    items: [
      { to: "/admin/mrr", icon: DollarSign, label: "MRR tracker" },
      { to: "/admin/payments", icon: Receipt, label: "Payments" },
      { to: "/admin/refunds", icon: RotateCcw, label: "Refunds" },
      { to: "/admin/affiliate-payouts", icon: Coins, label: "Affiliate payouts" },
    ],
  },
  {
    label: "PLATFORM",
    items: [
      { to: "/admin/workflows-monitor", icon: Zap, label: "Workflows monitor" },
      { to: "/admin/integration-health", icon: Plug, label: "Integration health" },
      { to: "/admin/api-logs", icon: FileCode, label: "API logs" },
      { to: "/admin/webhook-logs", icon: Webhook, label: "Webhook logs" },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      { to: "/admin/support", icon: Headphones, label: "Support tickets" },
      { to: "/admin/admin-messenger", icon: MessageSquare, label: "Messenger" },
      { to: "/admin/feature-requests", icon: Lightbulb, label: "Feature requests" },
    ],
  },
  {
    label: "TEAM",
    items: [
      { to: "/admin/team", icon: UserCog, label: "Team members" },
      { to: "/admin/roles", icon: Shield, label: "Roles + permissions" },
      { to: "/admin/activity-logs", icon: Activity, label: "Activity logs" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { to: "/admin/settings", icon: Settings, label: "Platform settings" },
      { to: "/admin/emails", icon: Mail, label: "Email templates" },
      { to: "/admin/pricing-config", icon: Tag, label: "Pricing config" },
      { to: "/admin/river-config", icon: Bot, label: "River AI config" },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <aside
      className="w-[220px] flex-shrink-0 border-r overflow-y-auto hidden md:flex flex-col"
      style={{ background: "#08080a", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="p-4 pb-2">
        <span className="text-[13px] font-semibold text-foreground">Katexs</span>
      </div>

      <nav className="flex-1 px-2 pb-4 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-1">
              <span className="text-[10px] font-medium text-foreground-secondary uppercase tracking-[0.1em]">
                {section.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[12px] transition-colors ${
                      isActive
                        ? "bg-background-elevated text-foreground font-medium border-l-2 border-foreground"
                        : "text-foreground-secondary hover:text-foreground hover:bg-[#111114]"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
