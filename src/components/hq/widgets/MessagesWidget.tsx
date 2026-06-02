import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Conv { id: string; last_message_preview: string | null; last_message_at: string; other: { full_name: string | null; avatar_url: string | null } | null; }

export function MessagesWidget() {
  const { user } = useAuth();
  const [items, setItems] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, last_message_preview, last_message_at, participant_one, participant_two")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(3);
      const convs = (data ?? []) as any[];
      const otherIds = convs.map((c) => c.participant_one === user.id ? c.participant_two : c.participant_one);
      let profiles: Record<string, any> = {};
      if (otherIds.length) {
        const { data: ps } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherIds);
        for (const p of ps ?? []) profiles[p.id] = p;
      }
      setItems(convs.map((c) => ({
        id: c.id,
        last_message_preview: c.last_message_preview,
        last_message_at: c.last_message_at,
        other: profiles[c.participant_one === user.id ? c.participant_two : c.participant_one] ?? null,
      })));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <p className="text-sm text-foreground-muted">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-foreground-muted">No conversations yet.</p>;
  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link to={`/inbox/${c.id}`} className="flex items-start gap-3 hover:bg-background-subtle -mx-2 px-2 py-1.5 rounded">
            <div className="w-8 h-8 rounded-full bg-background-elevated shrink-0 overflow-hidden flex items-center justify-center text-xs font-medium">
              {c.other?.avatar_url ? <img src={c.other.avatar_url} alt="" className="w-full h-full object-cover" /> : (c.other?.full_name?.[0] ?? "?")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{c.other?.full_name ?? "Unknown"}</div>
              <div className="text-xs text-foreground-muted truncate">{c.last_message_preview ?? "—"}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
