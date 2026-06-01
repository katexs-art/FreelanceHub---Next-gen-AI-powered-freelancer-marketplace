import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function SaveGigButton({ gigId, className }: { gigId: string; className?: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("saved_gigs").select("id").eq("user_id", user.id).eq("gig_id", gigId).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user?.id, gigId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return nav("/login");
    if (saved) {
      await supabase.from("saved_gigs").delete().eq("user_id", user.id).eq("gig_id", gigId);
      setSaved(false);
    } else {
      const { error } = await supabase.from("saved_gigs").insert({ user_id: user.id, gig_id: gigId });
      if (!error) setSaved(true);
    }
  };

  return (
    <button onClick={toggle} aria-label={saved ? "Unsave service" : "Save service"}
      className={cn("w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background group", className)}>
      <Bookmark className={cn("h-4 w-4 transition-colors", saved ? "fill-current" : "group-hover:fill-current")} />
    </button>
  );
}
