import { describe, expect, it } from "vitest";

import { convertSettings } from "./settings";

const noPresets = { version: 2, state: { exercises: [] } };

describe("legacy settings conversion", () => {
  it("preserves version-2 presets, equipment, exercise references and muscle spelling", () => {
    const { settings, exerciseIds } = convertSettings(
      {
        version: 2,
        state: {
          equipment: {
            barbells: [{ barbellId: "1", value: "45", unit: "lbs" }],
            plates: [null, { plateId: "p", value: 5, unit: "kg", quantity: 2 }],
          },
          muscleGroups: ["Quads"],
          exercises: [
            {
              exerciseId: "ex",
              name: "Squat",
              loadKind: "BARBELL",
              barbellId: "1",
              primaryMuscles: ["quads"],
              notes: "hello",
              oneRepMax: { value: 300, unit: "lbs" },
            },
          ],
        },
      },
      {
        version: 2,
        state: {
          exercises: [
            {
              name: "Custom",
              loadKind: "RPE",
              primaryMuscles: ["Other", "Other"],
            },
          ],
        },
      },
    );
    expect(settings.barbells).toEqual([
      { id: "1", position: 0, value: 45, unit: "lbs" },
    ]);
    expect(settings.plates).toEqual([
      { id: "p", position: 0, value: 5, unit: "kg", quantity: 2 },
    ]);
    expect(exerciseIds.get("ex")).toBe("ex");
    expect(settings.exercises[0]).toMatchObject({
      name: "Squat",
      barbell_id: "1",
      notes: "hello",
      one_rep_max_value: 300,
      one_rep_max_unit: "lbs",
      deleted: 0,
    });
    expect(settings.muscles.map(({ name }) => name)).toEqual([
      "quads",
      "Other",
      "Quads",
    ]);
    expect(settings.presetMuscles).toHaveLength(2);
    expect(settings.presets[0]).toMatchObject({
      name: "Custom",
      load_kind: null,
    });
  });

  it("repairs duplicate exercise IDs and names without dropping exercises", () => {
    const { settings, exerciseIds } = convertSettings(
      {
        version: 2,
        state: {
          equipment: { barbells: [], plates: [] },
          muscleGroups: [],
          exercises: [
            { exerciseId: "x", name: "Bench Press", barbellId: "gone" },
            { exerciseId: "x", name: "benchpress" },
            { exerciseId: "y", name: "Bench Press", deleted: true },
          ],
        },
      },
      noPresets,
    );
    expect(settings.exercises).toHaveLength(3);
    expect(exerciseIds.get("x")).toBe("x");
    expect(settings.exercises[0]?.barbell_id).toBeNull();
    expect(settings.exercises[1]?.id).not.toBe("x");
    expect(settings.exercises[1]?.name).toBe("benchpress (2)");
    expect(settings.exercises[2]?.name).toBe("Bench Press");
  });

  it("reads muscles from old store versions", () => {
    const { settings } = convertSettings(
      {
        version: 0,
        state: {
          muscleGroups: [],
          exercises: [
            { exerciseId: "a", name: "Back Squat" },
            { exerciseId: "b", name: "Curl", primaryMuscle: "Biceps" },
          ],
        },
      },
      noPresets,
    );
    const muscleName = new Map(
      settings.muscles.map(({ id, name }) => [id, name]),
    );
    const musclesOf = (exercise: string) =>
      settings.exerciseMuscles
        .filter(({ exercise_id }) => exercise_id === exercise)
        .map(({ muscle_id }) => muscleName.get(muscle_id as number));
    expect(musclesOf("a")).toEqual(["Quads"]);
    expect(musclesOf("b")).toEqual(["Biceps"]);
    expect(
      settings.catalog.map(({ muscle_id }) =>
        muscleName.get(muscle_id as number),
      ),
    ).toEqual(["Biceps", "Quads"]);
  });

  it("distinguishes missing equipment and presets from explicitly empty ones", () => {
    const defaults = convertSettings(null, null).settings;
    expect(defaults.barbells).toHaveLength(3);
    expect(defaults.presets.length).toBeGreaterThan(0);
    expect(
      convertSettings(null, { version: 1, state: { exercises: [] } }).settings
        .presets,
    ).toHaveLength(defaults.presets.length);
    const empty = convertSettings(
      {
        version: 2,
        state: {
          equipment: { barbells: [], plates: [] },
          muscleGroups: [],
          exercises: [],
        },
      },
      noPresets,
    ).settings;
    expect(empty.barbells).toEqual([]);
    expect(empty.presets).toEqual([]);
    expect(empty.catalog).toEqual([]);
  });
});
