import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Switch } from "@/components/ui/switch";
import { getEmailPrefs, setEmailPrefs, type EmailPrefs } from "@/lib/emailPrefs";
import { toast } from "sonner";

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<EmailPrefs>(getEmailPrefs());

  const update = (key: keyof EmailPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setEmailPrefs(next);
    toast.success("Preferences saved");
  };

  const rows: { key: keyof EmailPrefs; title: string; desc: string }[] = [
    { key: "orders", title: "Project updates", desc: "New projects, deliveries, completions, refunds." },
    { key: "messages", title: "New messages", desc: "Email me when I receive a message in the inbox." },
    { key: "marketing", title: "Tips & promotions", desc: "Occasional product updates and recommendations." },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Email notifications</h1>
        <p className="text-foreground-muted mt-1 text-sm">Choose which transactional emails you want to receive.</p>
        <div className="mt-8 divide-y divide-border border border-border rounded-xl overflow-hidden bg-background">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between p-5">
              <div>
                <div className="font-medium text-sm">{r.title}</div>
                <div className="text-xs text-foreground-muted mt-0.5">{r.desc}</div>
              </div>
              <Switch checked={prefs[r.key]} onCheckedChange={(v) => update(r.key, !!v)} />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
