import type {
  ExerciseSetInsights,
  ProgramInsights,
} from "@activity-log/ui/utils";

import type { ExerciseSeriesProjection } from "../domain/exercise-series";
import type { ProgramInsightProjection } from "../domain/program-insights";

/** Presentation adapters leave primitive timestamps in the shared query cache. */
export function presentProgramInsights(
  projection: ProgramInsightProjection,
): ProgramInsights {
  return {
    muscleGroups: projection.muscleGroups,
    weeks: projection.weeks.map(({ week, startMs, endMs, muscleGroups }) => ({
      week,
      start: new Date(startMs),
      end: new Date(endMs),
      muscleGroups: muscleGroups.map(
        ({ partial: _partial, ...group }) => group,
      ),
    })),
  };
}

export function presentExerciseInsights(
  projection: ExerciseSeriesProjection,
): ExerciseSetInsights[] {
  return projection.series.map(({ setType, setNumber, selected, points }) => ({
    setType,
    setNumber,
    selected,
    points: points.map(({ dateMs, feedback, partial: _partial, ...point }) => ({
      ...point,
      date: dateMs === null ? undefined : new Date(dateMs),
      feedback: feedback ?? undefined,
    })),
  }));
}
