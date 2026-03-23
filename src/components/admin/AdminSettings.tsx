import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Bot } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platformName: "Katexs",
    supportEmail: "support@katexs.com",
    termsUrl: "https://katexs.com/terms",
    privacyUrl: "https://katexs.com/privacy",
    trialDays: "14",
    maintenanceMode: false,
    maintenanceMessage: "We're performing scheduled maintenance. Back shortly.",
  });

  return (
    <div className="space-y-6 max-w-[700px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Platform Settings</h1>
          <p className="text-[12px] text-foreground-secondary mt-0.5">Configure global platform options</p>
        </div>
        <Button size="sm" className="h-8 text-[11px] gap-1.5"><Save className="w-3 h-3" />Save changes</Button>
      </div>

      {/* General */}
      <div className="bg-background-card border border-border rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">General</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-foreground-secondary mb-1 block">Platform name</label>
            <Input value={settings.platformName} onChange={(e) => setSettings({ ...settings, platformName: e.target.value })} className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] text-foreground-secondary mb-1 block">Support email</label>
            <Input value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} className="h-9 text-[13px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-foreground-secondary mb-1 block">Terms URL</label>
              <Input value={settings.termsUrl} onChange={(e) => setSettings({ ...settings, termsUrl: e.target.value })} className="h-9 text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-foreground-secondary mb-1 block">Privacy URL</label>
              <Input value={settings.privacyUrl} onChange={(e) => setSettings({ ...settings, privacyUrl: e.target.value })} className="h-9 text-[13px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Trial */}
      <div className="bg-background-card border border-border rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">Trial Configuration</h3>
        <div>
          <label className="text-[11px] text-foreground-secondary mb-1 block">Default trial length (days)</label>
          <Input type="number" value={settings.trialDays} onChange={(e) => setSettings({ ...settings, trialDays: e.target.value })} className="h-9 text-[13px] w-[120px]" />
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-background-card border border-border rounded-[12px] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-foreground">Maintenance Mode</h3>
          <button
            onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
            className={`w-10 h-5 rounded-full relative transition-colors ${settings.maintenanceMode ? "bg-[#f09595]" : "bg-background-elevated border border-border"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-transform ${settings.maintenanceMode ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        {settings.maintenanceMode && (
          <div>
            <label className="text-[11px] text-foreground-secondary mb-1 block">Maintenance message</label>
            <Input value={settings.maintenanceMessage} onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })} className="h-9 text-[13px]" />
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-background-card border rounded-[12px] p-5 space-y-3" style={{ borderColor: "rgba(240,149,149,0.20)" }}>
        <h3 className="text-[14px] font-semibold text-[#f09595]">Danger Zone</h3>
        <p className="text-[12px] text-foreground-secondary">These actions are irreversible.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[11px] text-[#f09595] border-[#f09595]/20 hover:bg-[#f09595]/10">
            Purge all test data
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] text-[#f09595] border-[#f09595]/20 hover:bg-[#f09595]/10">
            Reset all workflows
          </Button>
        </div>
      </div>
    </div>
  );
}
