import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pings the `heartbeat_online` RPC every 60s while the tab is focused.
 * Marks the signed-in profile as online and updates last_seen.
 * The `mark_offline_stale` cron job flips them back to offline after 5 min idle.
 */
export function useOnlineHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const beat = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try { await supabase.rpc("heartbeat_online"); } catch { /* best effort */ }
    };

    beat();
    const id = setInterval(beat, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled]);
}
