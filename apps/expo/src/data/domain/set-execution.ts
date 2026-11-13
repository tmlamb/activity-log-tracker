import type { Weight } from "@activity-log/ui/utils";
import { round5 } from "@activity-log/ui/utils";

/** Frozen equivalent of the existing percentage-planning rule, without graphs. */
const warmupPercentages: Record<number, readonly number[]> = {
  1: [0.6],
  2: [0.4, 0.6],
  3: [0.4, 0.5, 0.6],
  4: [0.4, 0.5, 0.6, 0.7],
  5: [0.3, 0.4, 0.5, 0.6, 0.7],
};

export function plannedSetWeight(
  activity: {
    loadType: "PERCENT" | "RPE" | null;
    loadValue: number | null;
    warmupSetCount: number;
  },
  set: { kind: "Warmup" | "Main"; index: number; weight: Weight | null },
  oneRepMax: Weight | null,
): Weight | null {
  if (activity.loadType === "RPE") return set.weight;
  if (activity.loadType !== "PERCENT" || !oneRepMax?.value) return null;
  const percentages =
    warmupPercentages[activity.warmupSetCount] ?? warmupPercentages[5] ?? [];
  const percent =
    set.kind === "Main"
      ? activity.loadValue
      : (percentages[set.index] ?? percentages.at(-1));
  return percent
    ? { value: round5(oneRepMax.value * percent), unit: oneRepMax.unit }
    : null;
}
