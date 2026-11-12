import { describe, expect, it } from "vitest";

import { convertSettings } from "./settings";

describe("legacy settings conversion", () => {
  it("preserves version-2 presets, equipment, exercise references and muscle spelling", () => {
    const result = convertSettings(
      {
        version: 2,
        state: {
          equipment: {
            barbells: [{ barbellId: "1", value: 45, unit: "lbs" }],
            plates: [],
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
    expect(result.barbells).toEqual([
      { id: "1", position: 0, value: 45, unit: "lbs" },
    ]);
    expect(result.exerciseIds.get("ex")).toBe("ex");
    expect(result.exercises[0]).toMatchObject({
      name: "Squat",
      barbell_id: "1",
      notes: "hello",
    });
    expect(result.muscles.map(({ name }) => name)).toEqual([
      "quads",
      "Other",
      "Quads",
    ]);
    expect(result.presetMuscles).toHaveLength(2);
    expect(result.presets[0]).toMatchObject({
      name: "Custom",
      load_kind: null,
    });
    expect(result.repairs.map(({ reason }) => reason)).toContain(
      "invalid-load-kind",
    );
  });

  it("repairs duplicate exercise IDs and names without dropping exercises", () => {
    const input = {
      version: 2,
      state: {
        equipment: { barbells: [], plates: [] },
        muscleGroups: [],
        exercises: [
          { exerciseId: "x", name: "Bench Press", loadKind: "BARBELL" },
          { exerciseId: "x", name: "benchpress", loadKind: "BARBELL" },
        ],
      },
    };
    const result = convertSettings(input, {
      version: 2,
      state: { exercises: [] },
    });
    expect(result.exercises).toHaveLength(2);
    expect(result.exerciseIds.get("x")).toBe("x");
    expect(result.exercises[1]?.id).not.toBe("x");
    expect(result.exercises[1]?.normalized_name).not.toBe("benchpress");
    expect(result.identities.some(({ reason }) => reason === "duplicate")).toBe(
      true,
    );
    expect(
      result.repairs.some(({ reason }) => reason === "duplicate-exercise-name"),
    ).toBe(true);
    expect(
      convertSettings(input, { version: 2, state: { exercises: [] } }),
    ).toEqual(result);
  });

  it("distinguishes missing equipment and presets from explicitly empty ones", () => {
    const defaults = convertSettings(null, null);
    expect(defaults.barbells).toHaveLength(3);
    expect(defaults.presets.length).toBeGreaterThan(0);
    const empty = convertSettings(
      {
        version: 2,
        state: {
          equipment: { barbells: [], plates: [] },
          muscleGroups: [],
          exercises: [],
        },
      },
      { version: 2, state: { exercises: [] } },
    );
    expect(empty.barbells).toEqual([]);
    expect(empty.presets).toEqual([]);
    expect(empty.catalog).toEqual([]);
  });
});
