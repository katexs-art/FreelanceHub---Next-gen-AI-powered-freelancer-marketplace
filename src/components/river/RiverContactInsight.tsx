import { useState, useEffect } from "react";
import { riverAnalyzeContact, type RiverContext } from "@/services/river";
import { RiverThinking } from "./RiverThinking";

interface Props {
  contactData: string;
  context: RiverContext;
}

export function RiverContactInsight({ contactData, context }: Props) {
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [assessment, setAssessment] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    setLoading(true);
    riverAnalyzeContact({ ...context, contactData })
      .then((result) => {
        setScore(result.score);
        setAssessment(result.assessment);
        setAction(result.action);
      })
      .catch(() => {
        setAssessment("Unable to analyze at this time.");
        setScore(50);
      })
      .finally(() => setLoading(false));
  }, [contactData]);

  if (loading) return <div className="py-3"><RiverThinking text="River is analyzing..." /></div>;

  return (
    <div className="space-y-3">
      {/* Score bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-foreground-muted">Conversion likelihood</span>
          <span className="text-[12px] font-semibold text-foreground">{score}%</span>
        </div>
        <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              background: score > 70 ? "hsl(var(--accent-green))" : score > 40 ? "#EF9F27" : "#f09595",
            }}
          />
        </div>
      </div>
      {/* Assessment */}
      <p className="text-[12px] text-foreground-secondary leading-relaxed">{assessment}</p>
      {/* Action */}
      <div
        className="rounded-md px-3 py-2 text-[11px] text-accent-green"
        style={{ background: "rgba(74,222,128,0.05)", borderLeft: "2px solid hsl(var(--accent-green))" }}
      >
        → {action}
      </div>
    </div>
  );
}
