import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function VerifiedBadge({ sellerId }: { sellerId: string }) {
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    supabase.from("seller_verifications").select("status").eq("seller_id", sellerId).maybeSingle()
      .then(({ data }) => setVerified((data as any)?.status === "verified"));
  }, [sellerId]);
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
      <BadgeCheck className="h-3.5 w-3.5" /> Verified
    </span>
  );
}
