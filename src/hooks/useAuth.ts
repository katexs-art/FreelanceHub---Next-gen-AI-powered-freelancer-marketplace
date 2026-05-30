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
  // `loading` covers the initial session probe; flips false as soon as we know
  // whether a session exists. `profileLoaded` flips true once the profile fetch resolves.
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (!mounted) return;
      setProfile(data as Profile | null);
      setProfileLoaded(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setProfileLoaded(false);
        setTimeout(() => { if (mounted) loadProfile(session.user.id); }, 0);
      } else {
        setProfile(null);
        setProfileLoaded(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) loadProfile(session.user.id);
      else setProfileLoaded(true);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileLoaded(true);
  };

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data as Profile | null);
    setProfileLoaded(true);
  };

  return { user, profile, loading, profileLoaded, signOut, refresh };
}
