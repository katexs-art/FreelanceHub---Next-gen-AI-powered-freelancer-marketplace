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

// ---------------------------------------------------------------------------
// Singleton auth store
// ---------------------------------------------------------------------------
// All components that call useAuth() share this state. We fetch the session
// exactly once at module load, then keep it in sync via onAuthStateChange.
// This avoids the "flash of logged-out" bug where every component remount
// (e.g. on route change) was re-probing the session from null -> user, which
// caused pages to think the user had been signed out and redirect to /login.

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;       // initial session probe in flight
  profileLoaded: boolean; // profile fetch resolved (success or empty)
};

let state: AuthState = {
  user: null,
  profile: null,
  loading: true,
  profileLoaded: false,
};

const listeners = new Set<(s: AuthState) => void>();

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

async function loadProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  // Only commit if this is still the active user
  if (state.user?.id !== userId) return;
  setState({ profile: (data as Profile | null) ?? null, profileLoaded: true });
}

// Initialise once at module load.
let initialised = false;
function init() {
  if (initialised) return;
  initialised = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user ?? null;
    setState({ user: u, loading: false });
    if (u) {
      setState({ profileLoaded: false });
      // Defer to avoid deadlocks inside the auth callback
      setTimeout(() => loadProfile(u.id), 0);
    } else {
      setState({ profile: null, profileLoaded: true });
    }
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    const u = session?.user ?? null;
    setState({ user: u, loading: false });
    if (u) loadProfile(u.id);
    else setState({ profileLoaded: true });
  });
}

init();

export function useAuth() {
  const [snap, setSnap] = useState<AuthState>(state);

  useEffect(() => {
    listeners.add(setSnap);
    // Re-sync in case state changed between render and effect
    setSnap(state);
    return () => {
      listeners.delete(setSnap);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, profile: null, profileLoaded: true });
  };

  const refresh = async () => {
    if (!state.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", state.user.id)
      .maybeSingle();
    setState({ profile: (data as Profile | null) ?? null, profileLoaded: true });
  };

  return {
    user: snap.user,
    profile: snap.profile,
    loading: snap.loading,
    profileLoaded: snap.profileLoaded,
    signOut,
    refresh,
  };
}
