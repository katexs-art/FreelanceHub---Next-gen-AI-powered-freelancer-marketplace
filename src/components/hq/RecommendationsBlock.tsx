import { ExpertsYouMightNeed } from "@/components/hq/ExpertsYouMightNeed";
import { ProjectRecsRow } from "@/components/hq/ProjectRecsRow";

export function RecommendationsBlock() {
  return (
    <div className="mt-12 pt-10 border-t border-border flex flex-col gap-12">
      <ExpertsYouMightNeed />
      <ProjectRecsRow />
    </div>
  );
}
