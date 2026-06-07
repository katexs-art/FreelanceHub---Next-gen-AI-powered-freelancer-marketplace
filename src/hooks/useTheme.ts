import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const THEMES = [
  { id: "clean-white", name: "Clean White" },
  { id: "midnight", name: "Midnight" },
  { id: "ocean", name: "Ocean" },
  { id: "forest", name: "Forest" },
  { id: "sunset", name: "Sunset" },
  { id: "purple-haze", name: "Purple Haze" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "kx-theme";

const listeners = new Set<(s: { saved: ThemeId; preview: ThemeId | null }) => void>();
let store: { saved: ThemeId; preview: ThemeId | null } = {
  saved: (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as ThemeId)) || "midnight",
  preview: null,
};

function update(patch: Partial<typeof store>) {
  store = { ...store, ...patch };
  listeners.forEach((l) => l(store));
}

export function useTheme() {
  const { user, profile } = useAuth();
  const [snap, setSnap] = useState(store);

  useEffect(() => {
    listeners.add(setSnap);
    setSnap(store);
    return () => { listeners.delete(setSnap); };
  }, []);

  useEffect(() => {
    const t = (profile as any)?.theme_preference as ThemeId | undefined;
    if (t && t !== store.saved) {
      localStorage.setItem(STORAGE_KEY, t);
      update({ saved: t });
    }
  }, [profile?.id, (profile as any)?.theme_preference]);

  const setTheme = async (id: ThemeId) => {
    localStorage.setItem(STORAGE_KEY, id);
    update({ saved: id, preview: null });
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ theme_preference: id } as any)
        .eq("id", user.id);
      if (error) throw error;
    }
  };


  const preview = (id: ThemeId) => update({ preview: id });
  const clearPreview = () => update({ preview: null });

  return {
    theme: snap.preview ?? snap.saved,
    saved: snap.saved,
    preview: snap.preview,
    setTheme,
    setPreview: preview,
    clearPreview,
  };
}
