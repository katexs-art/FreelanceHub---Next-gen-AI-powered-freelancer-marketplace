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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
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
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return { user, profile, loading, signOut, refresh: () => user && loadProfile(user.id) };
}
