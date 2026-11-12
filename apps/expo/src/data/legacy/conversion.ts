import type { LegacyStorePair } from "./source";
import { parseLegacyEnvelope } from "./envelope";
import { convertSettings } from "./settings";
import { convertWorkoutHistory } from "./workout-history";

export function prepareLegacyConversion(source: LegacyStorePair) {
  const workout = parseLegacyEnvelope(source.workout, true);
  const presetStore = parseLegacyEnvelope(source.exercises);
  const settings = convertSettings(workout, presetStore);
  const history = convertWorkoutHistory(
    workout?.state.programs ?? [],
    settings.exerciseIds,
  );
  return {
    settings,
    history,
    report: {
      version: 1,
      workoutVersion: workout?.version ?? null,
      presetVersion: presetStore?.version ?? null,
      identities: [...settings.identities, ...history.identities],
      repairs: [...settings.repairs, ...history.repairs],
    },
  };
}
