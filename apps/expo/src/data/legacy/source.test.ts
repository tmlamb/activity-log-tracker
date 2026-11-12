import { describe, expect, it } from "vitest";

import { captureLegacySource, selectLegacySource } from "./source";

describe("legacy source", () => {
  it("selects the pre-restore pair when a restore was interrupted", () => {
    expect(
      selectLegacySource({
        workout: "partially restored",
        exercises: "new presets",
        restoreJournal: JSON.stringify({
          version: 1,
          stores: {
            "workout-storage": "previous workout",
            "exercise-storage": null,
          },
        }),
      }),
    ).toEqual({ workout: "previous workout", exercises: null });
  });

  it("refuses a malformed journal rather than selecting a potentially mixed pair", () => {
    expect(() =>
      selectLegacySource({
        workout: "workout",
        exercises: "presets",
        restoreJournal: '{"version":1,"stores":{}}',
      }),
    ).toThrow("journal is invalid");
  });

  it("captures null values and propagates storage failures", async () => {
    await expect(
      captureLegacySource({
        getItemAsync: (key) =>
          Promise.resolve(key === "workout-storage" ? "workout" : null),
      }),
    ).resolves.toEqual({
      workout: "workout",
      exercises: null,
      restoreJournal: null,
    });
    await expect(
      captureLegacySource({
        getItemAsync: () => Promise.reject(new Error("storage unavailable")),
      }),
    ).rejects.toThrow("storage unavailable");
  });
});
