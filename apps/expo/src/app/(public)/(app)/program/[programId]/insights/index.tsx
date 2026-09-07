import { Redirect, useLocalSearchParams } from "expo-router";

import { buildProgramInsights } from "@activity-log/ui/utils";

import ProgramInsights from "~/components/program-insights";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function ProgramInsightsScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const program = useWorkoutStore((state) =>
    state.programs.find((candidate) => candidate.programId === programId),
  );
  const exercises = useWorkoutStore((state) => state.exercises);

  if (!program) return <Redirect href="/(public)/(app)" />;

  return (
    <ProgramInsights
      programName={program.name}
      insights={buildProgramInsights(program, exercises)}
    />
  );
}
