import { supabase } from "@/integrations/supabase/client";

export async function trackPromotionEvent(promotionId: string, event: "impression" | "click") {
  try {
    await supabase.rpc("track_promotion_event", { _promotion_id: promotionId, _event: event });
  } catch {
    // best-effort
  }
}
