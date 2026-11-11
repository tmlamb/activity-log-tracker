import type {
  Activity,
  Session,
  Weight,
  WorkoutSet,
} from "@activity-log/ui/utils";
import { isSessionTerminalStatus } from "@activity-log/ui/utils";

export const fallbackSetWeight = (
  activities: Activity[],
  index: number,
  type: "Warmup" | "Main",
  sources: Session[],
): Weight | undefined => {
  const activity = activities[index];
  if (activity?.load.type !== "RPE") return undefined;
  const occurrence = activities
    .slice(0, index)
    .filter((item) => item.exerciseId === activity.exerciseId).length;
  for (const source of sources) {
    const sourceActivity = source.activities.filter(
      (item) => item.exerciseId === activity.exerciseId,
    )[occurrence];
    const sets =
      type === "Warmup" ? sourceActivity?.warmupSets : sourceActivity?.mainSets;
    const weight = sets
      ?.slice()
      .reverse()
      .find((set) => set.weight)?.weight;
    if (weight) return weight;
  }
  return undefined;
};

export const numberToWorkoutSetArray = <T extends WorkoutSet>(
  length: number,
  current: T[],
  type: T["type"],
  createId: () => string,
  session?: Session,
  fallbackWeight?: Weight,
  inheritWeight = true,
): T[] => {
  const sets = current.slice(0, length);
  const sessionIsTerminal = session
    ? isSessionTerminalStatus(session.status)
    : false;
  while (sets.length < length) {
    sets.push({
      workoutSetId: createId(),
      type,
      status: sessionIsTerminal ? "Incomplete" : "Planned",
      start: sessionIsTerminal ? session?.end : undefined,
      end: sessionIsTerminal ? session?.end : undefined,
      weight: inheritWeight
        ? sets.length
          ? sets[sets.length - 1]?.weight
          : fallbackWeight
        : undefined,
      actualReps: 0,
      feedback: "Neutral",
    } as T);
  }
  return sets;
};
