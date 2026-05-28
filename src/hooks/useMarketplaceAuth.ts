import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type MarketplaceRole = "client" | "expert" | "admin";

export interface MarketplaceProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: MarketplaceRole;
  avatar_url: string | null;
  business_name: string | null;
  industry: string | null;
}

export function useMarketplaceAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => loadProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles" as any)
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data as any);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return { user, profile, loading, signOut, refresh: () => user && loadProfile(user.id) };
}
