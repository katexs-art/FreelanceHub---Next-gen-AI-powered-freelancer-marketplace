import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield, Monitor, MapPin } from "lucide-react";

export default function SettingsSecurity() {
  const [passwords, setPasswords] = useState({ current: "", new_pw: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const strength = (() => {
    const p = passwords.new_pw;
    if (!p) return { label: "", pct: 0, color: "" };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = ["Weak", "Fair", "Strong", "Very strong"];
    const colors = ["#f09595", "#EF9F27", "#4ade80", "#4ade80"];
    return { label: labels[score - 1] || "Weak", pct: score * 25, color: colors[score - 1] || "#f09595" };
  })();

  const handleUpdate = async () => {
    if (passwords.new_pw !== passwords.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwords.new_pw.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new_pw });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Password updated" });
      setPasswords({ current: "", new_pw: "", confirm: "" });
    }
  };

  const mockSessions = [
    { device: "Chrome on macOS", location: "New York, US", last: "Now", current: true },
    { device: "Safari on iPhone", location: "New York, US", last: "2 hours ago", current: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">Security</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">Manage your password and account security</p>
      </div>

      {/* Password */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">Password</h3>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Current password</label>
          <Input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="h-9 text-[13px]" />
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">New password</label>
          <Input type="password" value={passwords.new_pw} onChange={(e) => setPasswords({ ...passwords, new_pw: e.target.value })} className="h-9 text-[13px]" />
          {passwords.new_pw && (
            <div className="mt-2">
              <div className="h-1.5 bg-[#161619] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${strength.pct}%`, backgroundColor: strength.color }} />
              </div>
              <span className="text-[10px] mt-1 block" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Confirm new password</label>
          <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="h-9 text-[13px]" />
        </div>
        <Button onClick={handleUpdate} disabled={saving} size="sm" className="h-8 text-[11px]">
          {saving ? "Updating..." : "Update password"}
        </Button>
      </div>

      {/* 2FA */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <h3 className="text-[14px] font-semibold text-foreground">Two-factor authentication</h3>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#7a7975]" />
          <span className="text-[12px] text-[#7a7975]">Not enabled</span>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[11px]">Enable 2FA</Button>
      </div>

      {/* Sessions */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-foreground">Active sessions</h3>
          <Button variant="outline" size="sm" className="h-7 text-[10px]">Sign out all others</Button>
        </div>
        <div className="space-y-2">
          {mockSessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-[#7a7975]" />
                <div>
                  <div className="text-[12px] text-foreground">{s.device}</div>
                  <div className="text-[10px] text-[#7a7975] flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{s.location}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[#7a7975]">{s.last}</div>
                {s.current && <span className="text-[9px] bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full">Current</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
