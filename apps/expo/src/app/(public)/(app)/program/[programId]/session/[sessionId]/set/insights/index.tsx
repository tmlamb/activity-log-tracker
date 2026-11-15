import { useMemo } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import ExerciseInsights from "~/components/exercise-insights";
import { presentExerciseInsights } from "~/data/insight-presenters";
import { useExerciseSeries } from "~/data/queries";

export default function ExerciseInsightsScreen() {
  const { programId, sessionId, activityId, workoutSetId } =
    useLocalSearchParams<{
      programId: string;
      sessionId: string;
      activityId: string;
      workoutSetId: string;
    }>();
  const series = useExerciseSeries({
    programId,
    sessionId,
    activityId,
    setId: workoutSetId,
  });
  const insights = useMemo(
    () => (series ? presentExerciseInsights(series) : null),
    [series],
  );
  if (!series || !insights) return <Redirect href="/(public)/(app)" />;
  return (
    <ExerciseInsights
      exerciseName={series.exerciseName}
      sessionName={series.sessionName}
      insights={insights}
      partial={series.partial}
    />
  );
}
