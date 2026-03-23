import { useState, useEffect } from "react";
import { riverAffiliateCoach, type RiverContext } from "@/services/river";
import { RiverThinking } from "./RiverThinking";
import { RefreshCw } from "lucide-react";

interface Props {
  affiliateStats: string;
  context: RiverContext;
}

export function RiverAffiliateCoach({ affiliateStats, context }: Props) {
  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState("");

  const fetchTip = () => {
    setLoading(true);
    riverAffiliateCoach({ ...context, affiliateStats })
      .then(setTip)
      .catch(() => setTip("Share your link consistently and focus on service businesses in your network."))
      .finally(() => setLoading(false));
  };

  useEffect(fetchTip, [affiliateStats]);

  return (
    <div
      className="rounded-[10px] p-4"
      style={{
        background: "rgba(127,119,221,0.06)",
        border: "1px solid rgba(127,119,221,0.15)",
        borderTop: "2px solid #7F77DD",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-accent-purple" />
        <span className="text-[13px] font-semibold" style={{ color: "#AFA9EC" }}>River's tips for you</span>
        <span className="flex-1" />
        <button onClick={fetchTip} disabled={loading} className="p-1 text-foreground-muted hover:text-foreground">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading ? <RiverThinking text="Analyzing your performance..." /> : (
        <p className="text-[12px] text-foreground-secondary leading-relaxed">{tip}</p>
      )}
    </div>
  );
}
