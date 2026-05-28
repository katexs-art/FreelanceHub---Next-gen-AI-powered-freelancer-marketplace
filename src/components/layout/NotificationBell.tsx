import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Notification {
  id: string; type: string; title: string; body: string | null;
  link: string | null; is_read: boolean; created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications").select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    setItems((data ?? []) as Notification[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notif-bell")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const unread = items.filter((i) => !i.is_read).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
    load();
  };

  return (
    <DropdownMenu onOpenChange={(o) => o && markAllRead()}>
      <DropdownMenuTrigger className="relative p-2 text-foreground-muted hover:text-foreground">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">Notifications</div>
        {items.length === 0 ? (
          <div className="p-6 text-xs text-center text-foreground-muted">No notifications yet.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const body = (
                <div className={cn("px-4 py-3 border-b border-border/60 hover:bg-background-elevated",
                  !n.is_read && "bg-primary/5")}>
                  <div className="text-sm font-medium line-clamp-1">{n.title}</div>
                  {n.body && <div className="text-xs text-foreground-muted line-clamp-2 mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-foreground-muted mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              );
              return n.link ? <Link key={n.id} to={n.link}>{body}</Link> : <div key={n.id}>{body}</div>;
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
