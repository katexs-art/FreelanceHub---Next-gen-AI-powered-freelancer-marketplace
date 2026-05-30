import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "client" | "seller" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  role: AppRole;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  seller_status?: string | null;
  rejection_reason?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (!mounted) return;
      setProfile(data as Profile | null);
      setLoading(false);
    };

    // Listen for auth state changes first (sync callback only — async work deferred)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        setTimeout(() => { if (mounted) loadProfile(session.user.id); }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data as Profile | null);
  };

  return { user, profile, loading, signOut, refresh };
}
