import type {
  ExerciseSetInsights,
  ProgramInsightMetrics,
  ProgramInsights,
} from "@activity-log/ui/utils";

import type { ExerciseSeriesProjection } from "./domain/exercise-series";
import type { ProgramInsightProjection } from "./domain/program-insights";
import type { SetKind } from "./repositories/session-detail";

/**
 * One set's insights; unlike the legacy shape, a set may be a drop set, and a
 * point may show the set of an alternative performed in its place.
 */
export type ExerciseSetInsightsView = Omit<
  ExerciseSetInsights,
  "setType" | "points"
> & {
  setType: SetKind;
  points: (ExerciseSetInsights["points"][number] & {
    alternativeName?: string;
  })[];
};

/**
 * Program insights with each muscle group's drop sets: counted in its totals
 * and pending metrics, and also on their own, which the legacy shape lacks.
 */
export type ProgramInsightsView = Omit<ProgramInsights, "weeks"> & {
  weeks: (Omit<ProgramInsights["weeks"][number], "muscleGroups"> & {
    muscleGroups: (ProgramInsights["weeks"][number]["muscleGroups"][number] & {
      drop: ProgramInsightMetrics;
      dropPending: ProgramInsightMetrics;
    })[];
  })[];
};

/** Presentation adapters leave primitive timestamps in the shared query cache. */
export function presentProgramInsights(
  projection: ProgramInsightProjection,
): ProgramInsightsView {
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
): ExerciseSetInsightsView[] {
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
