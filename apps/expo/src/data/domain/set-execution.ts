import type { Weight } from "@activity-log/ui/utils";
import { round5 } from "@activity-log/ui/utils";

/**
 * How much lighter each drop set is than the set before it when a row hasn't
 * chosen its own drop percentage.
 */
export const DEFAULT_DROP_PERCENT = 0.2;

/** Frozen equivalent of the existing percentage-planning rule, without graphs. */
const warmupPercentages: Record<number, readonly number[]> = {
  1: [0.6],
  2: [0.4, 0.6],
  3: [0.4, 0.5, 0.6],
  4: [0.4, 0.5, 0.6, 0.7],
  5: [0.3, 0.4, 0.5, 0.6, 0.7],
};

/** The weight a warmup or main set is planned at. */
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

/**
 * The weight a drop set (the `index`th, from 0) is planned at: the row's drop
 * percentage lighter than the set before it, which is the previous drop set, or else the
 * row's last main set, or else its last warmup set. An earlier set counts at
 * its recorded weight, or at its own planned weight when it has none yet.
 * `sets` are the row's sets in performing order: warmups, mains, then drops.
 */
export function plannedDropSetWeight(
  activity: {
    loadType: "PERCENT" | "RPE" | null;
    loadValue: number | null;
    warmupSetCount: number;
    /** Null for the default (see DEFAULT_DROP_PERCENT). */
    dropPercent: number | null;
  },
  sets: readonly {
    kind: "Warmup" | "Main" | "Drop";
    weight: Weight | null;
  }[],
  index: number,
  oneRepMax: Weight | null,
): Weight | null {
  const dropPercent = activity.dropPercent ?? DEFAULT_DROP_PERCENT;
  const recorded = (value: Weight | null | undefined) =>
    value && value.value > 0 ? value : null;
  const ofKind = (kind: "Warmup" | "Main" | "Drop") =>
    sets.filter((item) => item.kind === kind);
  const mains = ofKind("Main");
  const kind = mains.length ? "Main" : "Warmup";
  const previous = mains.length ? mains : ofKind("Warmup");
  const last = previous.at(-1);
  if (!last) return null;
  let weight =
    recorded(last.weight) ??
    plannedSetWeight(
      activity,
      { kind, index: previous.length - 1, weight: last.weight },
      oneRepMax,
    );
  const drops = ofKind("Drop");
  for (let number = 0; number <= index; number++) {
    if (!weight) return null;
    weight = {
      value: round5(weight.value * (1 - dropPercent)),
      unit: weight.unit,
    };
    if (number < index) weight = recorded(drops[number]?.weight) ?? weight;
  }
  return weight;
}
