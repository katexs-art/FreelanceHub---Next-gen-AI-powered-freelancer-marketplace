import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function AnalyticsWidget() {
  const { user } = useAuth();
  const [s, setS] = useState({ impressions: 0, clicks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("gigs").select("impressions, clicks").eq("seller_id", user.id)
      .then(({ data }) => {
        const impressions = (data ?? []).reduce((a, g: any) => a + (g.impressions ?? 0), 0);
        const clicks = (data ?? []).reduce((a, g: any) => a + (g.clicks ?? 0), 0);
        setS({ impressions, clicks });
        setLoading(false);
      });
  }, [user?.id]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-background-subtle p-3">
        <div className="text-[10px] uppercase tracking-wider text-foreground-muted font-mono">Impressions</div>
        <div className="text-lg font-semibold tabular-nums mt-1">{s.impressions.toLocaleString()}</div>
      </div>
      <div className="rounded-lg bg-background-subtle p-3">
        <div className="text-[10px] uppercase tracking-wider text-foreground-muted font-mono">Gig clicks</div>
        <div className="text-lg font-semibold tabular-nums mt-1">{s.clicks.toLocaleString()}</div>
      </div>
    </div>
  );
}
