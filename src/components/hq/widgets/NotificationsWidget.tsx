import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notif { id: string; title: string; body: string | null; link: string | null; created_at: string; is_read: boolean; }

export function NotificationsWidget() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("id, title, body, link, created_at, is_read").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => { setItems((data ?? []) as Notif[]); setLoading(false); });
  }, [user?.id]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-foreground-muted">No notifications.</p>;
  return (
    <ul className="space-y-2">
      {items.map((n) => {
        const inner = (
          <div className="flex items-start gap-2">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.is_read ? "bg-foreground-subtle" : "bg-primary"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{n.title}</div>
              {n.body && <div className="text-xs text-foreground-muted truncate">{n.body}</div>}
            </div>
          </div>
        );
        return <li key={n.id}>{n.link ? <Link to={n.link} className="hover:text-primary block">{inner}</Link> : inner}</li>;
      })}
    </ul>
  );
}
