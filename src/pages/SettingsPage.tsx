import { useState } from "react";
import { User, Building2, Bell, Shield, Bot, Phone, MessageSquare, Clock, CreditCard, Receipt, BarChart3, Users, UserPlus, Key, Webhook, FileText, Trash2, ChevronRight } from "lucide-react";
import SettingsProfile from "@/components/settings/SettingsProfile";
import SettingsBusiness from "@/components/settings/SettingsBusiness";
import SettingsNotifications from "@/components/settings/SettingsNotifications";
import SettingsSecurity from "@/components/settings/SettingsSecurity";
import SettingsRiver from "@/components/settings/SettingsRiver";
import SettingsWorkingHours from "@/components/settings/SettingsWorkingHours";
import SettingsBilling from "@/components/settings/SettingsBilling";
import SettingsTeam from "@/components/settings/SettingsTeam";
import SettingsApiKeys from "@/components/settings/SettingsApiKeys";
import SettingsDeleteAccount from "@/components/settings/SettingsDeleteAccount";
import { useNavigate } from "react-router-dom";

type SettingsSection = "profile" | "business" | "notifications" | "security" | "river" | "working-hours" | "billing" | "team" | "api-keys" | "delete-account";

const navSections = [
  {
    label: "ACCOUNT",
    items: [
      { id: "profile" as const, label: "Profile", icon: User },
      { id: "business" as const, label: "Business info", icon: Building2 },
      { id: "notifications" as const, label: "Notifications", icon: Bell },
      { id: "security" as const, label: "Security", icon: Shield },
    ],
  },
  {
    label: "PLATFORM",
    items: [
      { id: "river" as const, label: "River AI", icon: Bot },
      { id: "working-hours" as const, label: "Working hours", icon: Clock },
    ],
  },
  {
    label: "BILLING",
    items: [
      { id: "billing" as const, label: "Plan + billing", icon: CreditCard },
    ],
  },
  {
    label: "TEAM",
    items: [
      { id: "team" as const, label: "Team members", icon: Users },
    ],
  },
  {
    label: "DEVELOPER",
    items: [
      { id: "api-keys" as const, label: "API keys", icon: Key },
    ],
  },
];

const SettingsPage = () => {
  const [active, setActive] = useState<SettingsSection>("profile");
  const navigate = useNavigate();

  const renderContent = () => {
    switch (active) {
      case "profile": return <SettingsProfile />;
      case "business": return <SettingsBusiness />;
      case "notifications": return <SettingsNotifications />;
      case "security": return <SettingsSecurity />;
      case "river": return <SettingsRiver />;
      case "working-hours": return <SettingsWorkingHours />;
      case "billing": return <SettingsBilling />;
      case "team": return <SettingsTeam />;
      case "api-keys": return <SettingsApiKeys />;
      case "delete-account": return <SettingsDeleteAccount />;
      default: return <SettingsProfile />;
    }
  };

  return (
    <div className="flex h-full -m-6">
      {/* Settings Sidebar */}
      <div className="w-[200px] shrink-0 bg-[#08080a] border-r border-[rgba(255,255,255,0.06)] overflow-y-auto">
        <div className="p-4 pb-3">
          <h2 className="text-[14px] font-semibold text-foreground">Settings</h2>
        </div>

        <div className="space-y-4 pb-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="px-4 py-1 text-[10px] text-[#7a7975] uppercase tracking-[0.1em]">{section.label}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={`w-full flex items-center gap-2 px-4 py-[7px] text-[13px] rounded-[6px] mx-0 transition-colors ${
                    active === item.id
                      ? "bg-[#161619] text-foreground border-l-2 border-foreground"
                      : "text-[#7a7975] hover:bg-[#161619] hover:text-[#c8c7c2] border-l-2 border-transparent"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}

          {/* Integrations quick link */}
          <div>
            <div className="px-4 py-1 text-[10px] text-[#7a7975] uppercase tracking-[0.1em]">INTEGRATIONS</div>
            <button
              onClick={() => navigate("/integrations")}
              className="w-full flex items-center gap-2 px-4 py-[7px] text-[13px] text-[#7a7975] hover:bg-[#161619] hover:text-[#c8c7c2] border-l-2 border-transparent rounded-[6px]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              Go to integrations
            </button>
          </div>

          {/* Danger zone */}
          <div>
            <div className="px-4 py-1 text-[10px] text-[#7a7975] uppercase tracking-[0.1em]">DANGER ZONE</div>
            <button
              onClick={() => setActive("delete-account")}
              className={`w-full flex items-center gap-2 px-4 py-[7px] text-[13px] rounded-[6px] border-l-2 transition-colors ${
                active === "delete-account"
                  ? "bg-[#161619] text-[#f09595] border-[#f09595]"
                  : "text-[#f09595] hover:bg-[#161619] border-transparent"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete account
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[680px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
