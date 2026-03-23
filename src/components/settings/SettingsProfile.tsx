import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, CheckCircle } from "lucide-react";

const timezones = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "America/Toronto",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "Pacific/Auckland",
];

export default function SettingsProfile() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "", email: "", phone: "", timezone: "America/New_York", language: "en",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          timezone: (data as any).timezone || "America/New_York",
          language: (data as any).language || "en",
        });
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("users").update({
      full_name: profile.full_name,
      phone: profile.phone,
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
  };

  const names = profile.full_name.split(" ");
  const initials = (names[0]?.[0] || "") + (names[1]?.[0] || "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">Your profile</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">Manage your personal information</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-[80px] h-[80px] rounded-full bg-[#161619] border border-[rgba(255,255,255,0.12)] flex items-center justify-center text-[24px] font-semibold text-foreground uppercase">
          {initials || "?"}
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[11px]">Change avatar</Button>
      </div>

      {/* Form */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">First name</label>
            <Input
              value={names[0] || ""}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value + (names[1] ? " " + names[1] : "") })}
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Last name</label>
            <Input
              value={names.slice(1).join(" ") || ""}
              onChange={(e) => setProfile({ ...profile, full_name: (names[0] || "") + " " + e.target.value })}
              className="h-9 text-[13px]"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Email address</label>
          <div className="flex items-center gap-2">
            <Input value={profile.email} disabled className="h-9 text-[13px] flex-1 opacity-60" />
            <span className="flex items-center gap-1 text-[10px] text-[#4ade80] font-medium">
              <CheckCircle className="w-3 h-3" /> Verified
            </span>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Phone number</label>
          <Input
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            className="h-9 text-[13px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Timezone</label>
            <select
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              className="w-full h-9 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-foreground"
            >
              {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Language</label>
            <select
              value={profile.language}
              onChange={(e) => setProfile({ ...profile, language: e.target.value })}
              className="w-full h-9 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-foreground"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="h-9 text-[12px] gap-1.5">
        <Save className="w-3.5 h-3.5" />
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}
