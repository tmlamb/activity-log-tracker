import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";

import { presentExerciseInsights } from "~/data/insight-presenters";
import { useExerciseSeries } from "~/data/queries";
import useRouter from "~/hooks/use-router";
import ExerciseInsights from "./exercise-insights";
import MissingDataRedirect from "./MissingDataRedirect";

/**
 * Exercise Insights for the set in the route's parameters. Shared by an
 * activity's insights screen and the one pushed for an alternative's.
 */
export default function ExerciseInsightsScreen() {
  const router = useRouter();
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
  if (!series || !insights) return <MissingDataRedirect />;
  return (
    <ExerciseInsights
      exerciseName={series.exerciseName}
      sessionName={series.sessionName}
      insights={insights}
      partial={series.partial}
      superset={series.superset}
      alternatives={series.alternatives.map((alternative) => ({
        id: alternative.activityId,
        name: alternative.exerciseName,
        onPress: () =>
          router.push(
            `/(public)/(app)/program/${encodeURIComponent(programId)}/session/${encodeURIComponent(sessionId)}/set/insights/alternative?activityId=${encodeURIComponent(alternative.activityId)}&workoutSetId=${encodeURIComponent(alternative.setId)}`,
          ),
      }))}
    />
  );
}
