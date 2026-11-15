import { parseLegacyEnvelope } from "./envelope";
import { convertSettings } from "./settings";
import { convertWorkoutHistory } from "./workout-history";

/** Raw persisted JSON of the two retired stores; null when never written. */
export interface LegacyStorePair {
  workout: string | null;
  exercises: string | null;
}

/** Convert the retired stores to rows; a missing store yields the defaults. */
export function prepareLegacyConversion(source: LegacyStorePair) {
  const workout = parseLegacyEnvelope(source.workout);
  const { settings, exerciseIds } = convertSettings(
    workout,
    parseLegacyEnvelope(source.exercises),
  );
  const history = convertWorkoutHistory(workout?.state.programs, exerciseIds);
  return { settings, history };
}
