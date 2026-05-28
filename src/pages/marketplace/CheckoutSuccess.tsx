import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMarketplaceAuth } from "@/hooks/useMarketplaceAuth";
import { MarketplaceNav } from "@/components/marketplace/MarketplaceNav";
import { C, FONT, MONO } from "@/lib/marketplace/theme";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { user, loading: authLoading } = useMarketplaceAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"waiting" | "found" | "timeout">("waiting");
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!sessionId) { setStatus("timeout"); return; }

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from("projects" as any)
        .select("id")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const found = (data ?? [])[0];
      if (found) {
        setProjectId(found.id);
        setStatus("found");
        clearInterval(interval);
        setTimeout(() => navigate(`/project/${found.id}`), 1200);
      } else if (attempts >= 15) {
        setStatus("timeout");
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [authLoading, user, sessionId, navigate]);

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
      <MarketplaceNav />
      <div style={{ padding: "6rem 2rem", textAlign: "center", maxWidth: 540, margin: "0 auto" }}>
        <div style={{ fontSize: "0.7rem", color: C.neon, fontFamily: MONO, marginBottom: 12 }}>PAYMENT RECEIVED</div>
        <h1 style={{ fontSize: "2rem", margin: 0, fontWeight: 600 }}>
          {status === "waiting" && "Setting up your project…"}
          {status === "found" && "You're all set"}
          {status === "timeout" && "Payment confirmed"}
        </h1>
        <p style={{ color: C.gray, marginTop: 16, lineHeight: 1.6 }}>
          {status === "waiting" && "We're spinning up your project room. This takes a few seconds."}
          {status === "found" && "Redirecting you to your project…"}
          {status === "timeout" && "Your project will appear in your dashboard shortly."}
        </p>
        {status === "timeout" && (
          <button onClick={() => navigate(projectId ? `/project/${projectId}` : "/dashboard/client")} style={{
            marginTop: 24, background: C.neon, color: C.black, border: "none",
            borderRadius: 999, padding: "0.8rem 1.6rem", fontWeight: 600, cursor: "pointer",
          }}>Go to dashboard</button>
        )}
      </div>
    </div>
  );
}
