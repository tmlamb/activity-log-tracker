import { Redirect, useLocalSearchParams } from "expo-router";

import { buildExerciseInsights } from "@activity-log/ui/utils";

import ExerciseInsights from "~/components/exercise-insights";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function ExerciseInsightsScreen() {
  const { programId, sessionId, activityId, workoutSetId } =
    useLocalSearchParams<{
      programId: string;
      sessionId: string;
      activityId: string;
      workoutSetId: string;
    }>();
  const { programs, exercises } = useWorkoutStore((state) => state);
  const program = programs.find((item) => item.programId === programId);
  const session = program?.sessions.find(
    (item) => item.sessionId === sessionId,
  );
  const activity = session?.activities.find(
    (item) => item.activityId === activityId,
  );
  const exercise = exercises.find(
    (item) => item.exerciseId === activity?.exerciseId,
  );
  const workoutSet =
    activity?.mainSets.find((item) => item.workoutSetId === workoutSetId) ??
    activity?.warmupSets.find((item) => item.workoutSetId === workoutSetId);

  if (
    !program ||
    !session?.templateId ||
    !activity ||
    !exercise ||
    !workoutSet
  ) {
    return <Redirect href="/(public)/(app)" />;
  }

  return (
    <ExerciseInsights
      exerciseName={exercise.name}
      sessionName={session.name}
      insights={buildExerciseInsights(
        program,
        session,
        activity,
        workoutSet,
        exercise,
      )}
    />
  );
}
