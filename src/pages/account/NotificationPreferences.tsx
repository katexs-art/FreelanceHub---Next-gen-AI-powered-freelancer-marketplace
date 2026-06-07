import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setEmailPrefs } from "@/lib/emailPrefs";
import { toast } from "sonner";

type Prefs = {
  buyer_orders_inapp: boolean; buyer_orders_email: boolean;
  seller_orders_inapp: boolean; seller_orders_email: boolean;
  messages_inapp: boolean; messages_email: boolean;
  marketing_email: boolean;
};

const DEFAULTS: Prefs = {
  buyer_orders_inapp: true, buyer_orders_email: true,
  seller_orders_inapp: true, seller_orders_email: true,
  messages_inapp: true, messages_email: true,
  marketing_email: false,
};

type Row = {
  title: string;
  desc: string;
  inappKey?: keyof Prefs;
  emailKey: keyof Prefs;
};

const ROWS: Row[] = [
  { title: "Partner events", desc: "Orders you place: delivery, completion, refunds.", inappKey: "buyer_orders_inapp", emailKey: "buyer_orders_email" },
  { title: "Expert events", desc: "Orders you receive: new orders, requirements, deadlines.", inappKey: "seller_orders_inapp", emailKey: "seller_orders_email" },
  { title: "Messages", desc: "Direct messages and custom offers in your inbox.", inappKey: "messages_inapp", emailKey: "messages_email" },
  { title: "Tips & promotions", desc: "Occasional product updates and recommendations.", emailKey: "marketing_email" },
];

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*").eq("user_id", user.id).maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...(data as any) });
      setLoading(false);
    })();
  }, [user]);

  const update = async (key: keyof Prefs, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    if (error) { toast.error("Could not save"); return; }
    // Keep legacy localStorage gate (used by some client-side email triggers) in sync.
    setEmailPrefs({
      orders: next.buyer_orders_email || next.seller_orders_email,
      messages: next.messages_email,
      marketing: next.marketing_email,
    });
    toast.success("Preferences saved");
  };

  return (
    <>
      <SiteHeader showCategories={false} />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-foreground-muted mt-1 text-sm">
          Choose in-app and email alerts independently for each category.
        </p>

        <div className="mt-8 border border-border rounded-xl overflow-hidden bg-background">
          <div className="grid grid-cols-[1fr_90px_90px] items-center px-5 py-3 bg-muted/40 text-[11px] font-mono uppercase tracking-[0.1em] text-foreground-muted">
            <div>Category</div>
            <div className="text-center">In-app</div>
            <div className="text-center">Email</div>
          </div>
          {ROWS.map((r) => (
            <div key={r.title} className="grid grid-cols-[1fr_90px_90px] items-center px-5 py-4 border-t border-border">
              <div>
                <div className="font-medium text-sm">{r.title}</div>
                <div className="text-xs text-foreground-muted mt-0.5">{r.desc}</div>
              </div>
              <div className="flex justify-center">
                {r.inappKey ? (
                  <Switch
                    checked={prefs[r.inappKey]}
                    disabled={loading}
                    onCheckedChange={(v) => update(r.inappKey!, !!v)}
                  />
                ) : (
                  <span className="text-xs text-foreground-muted">—</span>
                )}
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={prefs[r.emailKey]}
                  disabled={loading}
                  onCheckedChange={(v) => update(r.emailKey, !!v)}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-foreground-muted mt-4">
          Critical security and payment confirmations are always sent regardless of these settings.
        </p>
      </div>
      </div>
      <SiteFooter />
    </>
  );
}
