import { useState, useEffect } from "react";
import { riverPipelineInsight, type RiverContext } from "@/services/river";
import { RiverThinking } from "./RiverThinking";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  context: RiverContext;
  dealData: string;
}

export function RiverPipelineInsight({ context, dealData }: Props) {
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setLoading(true);
    riverPipelineInsight({ ...context, dealData })
      .then(setInsight)
      .catch(() => setInsight("Pipeline analysis will be available once you have more deal data."))
      .finally(() => setLoading(false));
  }, [dealData]);

  return (
    <div
      className="rounded-[10px] p-4 mb-4"
      style={{
        background: "rgba(127,119,221,0.06)",
        border: "1px solid rgba(127,119,221,0.15)",
        borderTop: "2px solid #7F77DD",
      }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="w-2 h-2 rounded-full bg-accent-purple" />
        <span className="text-[13px] font-semibold flex-1" style={{ color: "#AFA9EC" }}>
          River Pipeline Insights
        </span>
        {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-foreground-muted" /> : <ChevronUp className="w-3.5 h-3.5 text-foreground-muted" />}
      </button>
      {!collapsed && (
        <div className="mt-3 text-[13px] text-foreground-secondary leading-relaxed">
          {loading ? <RiverThinking text="Analyzing your pipeline..." /> : insight}
        </div>
      )}
    </div>
  );
}
