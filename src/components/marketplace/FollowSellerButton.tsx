import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, UserCheck } from "lucide-react";

export function FollowSellerButton({ sellerId }: { sellerId: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { count: c } = await supabase.from("seller_follows")
      .select("*", { count: "exact", head: true }).eq("seller_id", sellerId);
    setCount(c ?? 0);
    if (user) {
      const { data } = await supabase.from("seller_follows")
        .select("id").eq("follower_id", user.id).eq("seller_id", sellerId).maybeSingle();
      setFollowing(!!data);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id, sellerId]);

  const toggle = async () => {
    if (!user) return nav("/login");
    if (user.id === sellerId) return;
    setBusy(true);
    if (following) {
      await supabase.from("seller_follows").delete().eq("follower_id", user.id).eq("seller_id", sellerId);
    } else {
      await supabase.from("seller_follows").insert({ follower_id: user.id, seller_id: sellerId });
    }
    setBusy(false);
    load();
  };

  if (user?.id === sellerId) {
    return <div className="text-xs text-foreground-muted">{count} follower{count === 1 ? "" : "s"}</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant={following ? "outline" : "default"} onClick={toggle} disabled={busy}>
        {following ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
      </Button>
      <span className="text-xs text-foreground-muted">{count} follower{count === 1 ? "" : "s"}</span>
    </div>
  );
}
