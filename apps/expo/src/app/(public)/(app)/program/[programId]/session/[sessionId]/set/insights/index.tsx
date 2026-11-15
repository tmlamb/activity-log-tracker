import { useMemo } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import ExerciseInsights from "~/components/exercise-insights";
import { SQLiteQueryStatus } from "~/components/sqlite-query-status";
import { useApplicationDataRuntime } from "~/data/react/application-data";
import { presentExerciseInsights } from "~/data/react/insight-presenters";
import { useExerciseSeries } from "~/data/react/insight-queries";

export default function ExerciseInsightsScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteExerciseInsights runtime={runtime} />;
}

function SQLiteExerciseInsights({
  runtime,
}: {
  runtime: ApplicationDataRuntime;
}) {
  const { programId, sessionId, activityId, workoutSetId } =
    useLocalSearchParams<{
      programId: string;
      sessionId: string;
      activityId: string;
      workoutSetId: string;
    }>();
  const query = useExerciseSeries(runtime, {
    programId,
    sessionId,
    activityId,
    setId: workoutSetId,
  });
  const insights = useMemo(
    () => (query.data ? presentExerciseInsights(query.data) : null),
    [query.data],
  );
  if (query.data === undefined)
    return (
      <SQLiteQueryStatus
        error={query.isError}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data || !insights) return <Redirect href="/(public)/(app)" />;
  return (
    <ExerciseInsights
      exerciseName={query.data.exerciseName}
      sessionName={query.data.sessionName}
      insights={insights}
      partial={query.data.partial}
    />
  );
}
