import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function TestModeBanner() {
  const { profile } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "test_mode_enabled")
        .maybeSingle();
      if (mounted) setEnabled((data as any)?.value === "true");
    };
    load();
    const i = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(i); };
  }, []);

  if (profile?.role !== "admin" || !enabled) return null;

  return (
    <div className="w-full bg-black text-white text-xs font-mono uppercase tracking-[0.14em] py-2 px-4 flex items-center justify-center gap-3 border-b border-white/10">
      <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded-sm font-bold text-[10px]">TESTING</span>
      <span>TEST MODE ACTIVE — All payments are simulated. No real money moves.</span>
    </div>
  );
}
