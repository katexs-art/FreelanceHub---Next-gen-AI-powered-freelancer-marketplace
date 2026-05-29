import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function VerifiedBadge({ sellerId }: { sellerId: string }) {
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    supabase.rpc("get_seller_verification_status", { _seller: sellerId })
      .then(({ data }) => setVerified((data as any) === "verified"));
  }, [sellerId]);
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
      <BadgeCheck className="h-3.5 w-3.5" /> Verified
    </span>
  );
}
