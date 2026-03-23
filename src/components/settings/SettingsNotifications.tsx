import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const emailNotifications = [
  { key: "new_lead", label: "New lead notification", desc: "Email me when a new lead comes in" },
  { key: "missed_call", label: "Missed call alert", desc: "Email me when River handles a missed call" },
  { key: "deal_won", label: "Deal won", desc: "Email me when a deal is marked as won" },
  { key: "weekly_summary", label: "Weekly River summary", desc: "Receive River's weekly business summary every Monday" },
  { key: "trial_ending", label: "Trial ending reminders", desc: "Remind me before my trial ends" },
  { key: "payment_receipts", label: "Payment receipts", desc: "Email me payment confirmation receipts" },
  { key: "platform_updates", label: "Platform updates", desc: "News about new Katexs features" },
];

const inAppNotifications = [
  { key: "inapp_new_lead", label: "New lead", desc: "Show notification for new leads" },
  { key: "inapp_missed_call", label: "Missed calls", desc: "Show notification for missed calls" },
  { key: "inapp_deal_won", label: "Deal updates", desc: "Show notification for deal changes" },
  { key: "inapp_river_alert", label: "River alerts", desc: "Show River AI notifications" },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? "bg-[#4ade80]" : "bg-[#161619] border border-[rgba(255,255,255,0.08)]"}`}
    >
      <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SettingsNotifications() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [riverFreq, setRiverFreq] = useState("realtime");

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_settings").select("*").eq("user_id", user.id).then(({ data }) => {
      const map: Record<string, boolean> = {};
      (data || []).forEach((s: any) => { map[s.setting_key] = s.enabled; });
      // Set defaults for missing keys
      [...emailNotifications, ...inAppNotifications].forEach((n) => {
        if (!(n.key in map)) map[n.key] = true;
      });
      setSettings(map);
    });
  }, [user]);

  const handleToggle = async (key: string, val: boolean) => {
    if (!user) return;
    setSettings((prev) => ({ ...prev, [key]: val }));
    await supabase.from("notification_settings").upsert(
      { user_id: user.id, setting_key: key, enabled: val } as any,
      { onConflict: "user_id,setting_key" }
    );
    toast({ title: "Notification setting updated" });
  };

  const renderGroup = (items: typeof emailNotifications) => (
    <div className="divide-y divide-[rgba(255,255,255,0.04)]">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between py-3">
          <div>
            <div className="text-[13px] font-medium text-foreground">{item.label}</div>
            <div className="text-[11px] text-[#7a7975]">{item.desc}</div>
          </div>
          <Toggle enabled={settings[item.key] ?? true} onChange={(v) => handleToggle(item.key, v)} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">Notifications</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">Choose what you want to be notified about</p>
      </div>

      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5">
        <h3 className="text-[14px] font-semibold text-foreground mb-3">Email notifications</h3>
        {renderGroup(emailNotifications)}
      </div>

      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5">
        <h3 className="text-[14px] font-semibold text-foreground mb-3">In-app notifications</h3>
        {renderGroup(inAppNotifications)}
      </div>

      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">River alerts</h3>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Notification frequency</label>
          <select value={riverFreq} onChange={(e) => setRiverFreq(e.target.value)} className="w-full h-9 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-foreground">
            <option value="realtime">Real-time</option>
            <option value="hourly">Hourly digest</option>
            <option value="daily">Daily digest</option>
          </select>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-[13px] font-medium text-foreground">Quiet hours</div>
            <div className="text-[11px] text-[#7a7975]">Silence notifications during specific hours</div>
          </div>
          <Toggle enabled={false} onChange={() => {}} />
        </div>
      </div>
    </div>
  );
}
