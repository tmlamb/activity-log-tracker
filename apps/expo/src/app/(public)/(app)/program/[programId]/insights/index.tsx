import { useMemo } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import ProgramInsights from "~/components/program-insights";
import { presentProgramInsights } from "~/data/insight-presenters";
import { useProgramInsights } from "~/data/queries";

export default function ProgramInsightsScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const projection = useProgramInsights(programId);
  const insights = useMemo(
    () => (projection ? presentProgramInsights(projection) : null),
    [projection],
  );
  if (!projection || !insights) return <Redirect href="/(public)/(app)" />;
  return (
    <ProgramInsights
      programName={projection.programName}
      insights={insights}
      partial={projection.partial}
    />
  );
}
