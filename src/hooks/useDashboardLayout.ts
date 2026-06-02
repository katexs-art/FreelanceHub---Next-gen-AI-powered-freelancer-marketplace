import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WIDGETS, type WidgetId, defaultLayoutForRole } from "@/components/hq/widgets";

export type LayoutItem = { id: WidgetId; visible: boolean; collapsed: boolean };

const STORAGE_KEY = "kx-dashboard-layout";

function sanitize(input: any, role: string | undefined): LayoutItem[] {
  const validIds = new Set(Object.keys(WIDGETS) as WidgetId[]);
  const arr: LayoutItem[] = Array.isArray(input)
    ? input
        .filter((x) => x && validIds.has(x.id))
        .map((x) => ({
          id: x.id as WidgetId,
          visible: x.visible !== false,
          collapsed: !!x.collapsed,
        }))
    : [];

  // Filter by role
  const r = (role ?? "client") as "client" | "seller" | "admin";
  const allowed = arr.filter((x) => WIDGETS[x.id].roles.includes(r));

  if (allowed.length === 0) {
    return defaultLayoutForRole(r).map((id) => ({ id, visible: true, collapsed: false }));
  }

  // Append any newly-introduced widgets (hidden) so users can opt-in via Add Widget
  const present = new Set(allowed.map((x) => x.id));
  for (const id of Object.keys(WIDGETS) as WidgetId[]) {
    if (!present.has(id) && WIDGETS[id].roles.includes(r)) {
      allowed.push({ id, visible: false, collapsed: false });
    }
  }
  return allowed;
}

export function useDashboardLayout() {
  const { user, profile } = useAuth();
  const role = profile?.role;

  const initial = useMemo<LayoutItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) return sanitize(JSON.parse(cached), role);
      } catch {}
    }
    return sanitize([], role);
  }, []); // intentional one-shot

  const [layout, setLayout] = useState<LayoutItem[]>(initial);
  const saveTimer = useRef<number | null>(null);

  // Hydrate from profile once loaded
  useEffect(() => {
    if (!profile) return;
    const fromDb = (profile as any).dashboard_layout;
    const next = sanitize(fromDb, profile.role);
    setLayout(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const persist = (next: LayoutItem[]) => {
    setLayout(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    if (!user) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      supabase.from("profiles").update({ dashboard_layout: next } as any).eq("id", user.id);
    }, 400);
  };

  const reorder = (ids: WidgetId[]) => {
    const map = new Map(layout.map((l) => [l.id, l]));
    const next = ids.map((id) => map.get(id)!).filter(Boolean);
    // append anything missing
    for (const l of layout) if (!ids.includes(l.id)) next.push(l);
    persist(next);
  };
  const toggleVisible = (id: WidgetId) =>
    persist(layout.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  const toggleCollapse = (id: WidgetId) =>
    persist(layout.map((l) => (l.id === id ? { ...l, collapsed: !l.collapsed } : l)));
  const addWidget = (id: WidgetId) => {
    const exists = layout.find((l) => l.id === id);
    if (exists) {
      persist(layout.map((l) => (l.id === id ? { ...l, visible: true } : l)));
    } else {
      persist([...layout, { id, visible: true, collapsed: false }]);
    }
  };

  const visible = layout.filter((l) => l.visible);
  const hidden = layout.filter((l) => !l.visible);

  return { layout, visible, hidden, reorder, toggleVisible, toggleCollapse, addWidget };
}
