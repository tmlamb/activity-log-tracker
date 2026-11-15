import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Db } from "./database/db";
import { parseActivityLogBackup } from "../utils/app-data-backup";
import * as actions from "./actions";
import { parsePortableBackupV2 } from "./backup/portable-v2";
import { prepareApplicationRestore } from "./backup/prepare-restore";
import { createTestDb, nodeDb } from "./database/test-db";
import { newDraftActivity } from "./domain/session-editor-draft";
import { bootstrapDatabase } from "./legacy/bootstrap";
import { listMuscleCatalog } from "./repositories/catalog";
import { getEquipment } from "./repositories/equipment";
import { getSavedExercise } from "./repositories/exercises";
import { listProgramSummaries } from "./repositories/programs";
import { getSessionDetail } from "./repositories/session-detail";
import { getSetExecutionContext } from "./repositories/set-context";
import { createTemplateDraft } from "./repositories/template-draft";
import { resolveTemplateChoice } from "./repositories/templates";
import { read, setDatabase } from "./store";

vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => true }));

let raw: DatabaseSync | undefined;

function open(db: Db & { raw: DatabaseSync }) {
  raw = db.raw;
  setDatabase(db);
  return db;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.UTC(2026, 0, 1));
});

afterEach(() => {
  vi.useRealTimers();
  setDatabase(undefined);
  raw?.close();
  raw = undefined;
});

describe("application flow on real SQLite", () => {
  it("imports, plans, records, completes, clones, exports, resets and restores", () => {
    const stores = parseActivityLogBackup(
      readFileSync(
        new URL("./legacy/fixtures/backup-v1.json", import.meta.url),
        "utf8",
      ),
    );
    const keys = new Map([
      [
        "workout-storage",
        JSON.stringify({ version: 2, state: stores["workout-storage"] }),
      ],
      [
        "exercise-storage",
        JSON.stringify({ version: 2, state: stores["exercise-storage"] }),
      ],
    ]);
    const db = open(nodeDb(new DatabaseSync(":memory:")));
    db.execSync("PRAGMA foreign_keys = ON");
    bootstrapDatabase(db, {
      getItemSync: (key) => keys.get(key) ?? null,
      removeItemSync: (key) => keys.delete(key),
    });
    expect(keys.size).toBe(0);
    expect(read(listProgramSummaries)).toMatchObject([
      { id: "program-1", sessionCount: 1 },
    ]);

    const preset = read((d) =>
      d.getFirstSync<{ id: string }>(
        "SELECT id FROM exercise_presets WHERE name = 'Custom exercise'",
      ),
    );
    if (!preset) throw new Error("Missing custom preset");
    const exerciseId = actions.materializeExercisePreset(
      preset.id,
      "new-exercise",
    );
    expect(exerciseId).toBe("new-exercise");

    actions.createProgram("new-program", "New Program");
    let ids = 0;
    const activity = newDraftActivity(() => `id-${++ids}`, undefined);
    activity.exerciseId = exerciseId;
    activity.warmupSets = activity.warmupSets.slice(0, 1);
    activity.mainSets = activity.mainSets.slice(0, 1);
    const warmup = activity.warmupSets[0];
    const main = activity.mainSets[0];
    if (!warmup || !main) throw new Error("Missing test sets");
    actions.createSession(
      "new-program",
      "new-session",
      {
        name: "Training",
        deload: false,
        startMs: null,
        endMs: null,
        activities: [activity],
      },
      null,
    );
    const warmupRef = {
      programId: "new-program",
      sessionId: "new-session",
      activityId: activity.id,
      setId: warmup.id,
    };
    const mainRef = { ...warmupRef, setId: main.id };
    expect(read((d) => getSetExecutionContext(d, warmupRef))?.isStartable).toBe(
      true,
    );

    actions.startSet(warmupRef, {
      actualReps: 5,
      weight: { value: 40, unit: "lbs" },
      feedback: "Neutral",
    });
    actions.patchSet(warmupRef, { actualReps: 6 });
    vi.advanceTimersByTime(60_000);
    expect(
      actions.completeSet(warmupRef, {
        actualReps: 6,
        weight: { value: 40, unit: "lbs" },
        feedback: "Easy",
      }),
    ).toBe(main.id);
    expect(read((d) => getSetExecutionContext(d, mainRef))).toMatchObject({
      session: { status: "Ready" },
      set: { status: "Ready" },
    });
    vi.advanceTimersByTime(60_000);
    actions.completeSet(mainRef, {
      actualReps: 8,
      weight: { value: 60, unit: "lbs" },
      feedback: "Hard",
    });
    expect(actions.completeSession("new-program", "new-session")).toBe(true);

    const completed = read((d) =>
      getSessionDetail(d, "new-program", "new-session"),
    );
    if (!completed) throw new Error("Missing completed session");
    expect(completed.status).toBe("Done");
    actions.createSession(
      "new-program",
      "planned",
      createTemplateDraft(completed, () => `clone-${++ids}`),
      {
        sessionId: completed.id,
        baseRevision: completed.revision,
        newLineageId: "lineage",
      },
    );
    expect(
      read((d) => resolveTemplateChoice(d, "new-program", "new-session")),
    ).toEqual({ kind: "planned", sessionId: "planned" });

    const exported = actions.exportBackup();
    actions.resetApplicationData();
    expect(read(listProgramSummaries)).toEqual([]);
    actions.restoreApplicationData(prepareApplicationRestore(exported));
    expect(parsePortableBackupV2(actions.exportBackup()).data).toEqual(
      parsePortableBackupV2(exported).data,
    );
  });
});

describe("actions", () => {
  it("completes a ready session only once every set is recorded", () => {
    open(
      createTestDb(`INSERT INTO programs VALUES ('p','P',0);
        INSERT INTO sessions(program_id,id,name,position,status,deload) VALUES ('p','s','S',0,'Ready',0);
        INSERT INTO activities(program_id,session_id,id,position) VALUES ('p','s','a',0);
        INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback,actual_reps)
          VALUES ('p','s','a','done','Main',0,'Done','Neutral',5), ('p','s','a','new','Main',1,'Planned','Neutral',0);`),
    );
    const status = () => read((d) => getSessionDetail(d, "p", "s"))?.status;
    expect(actions.completeSession("p", "s")).toBe(false);
    expect(status()).toBe("Ready");
    raw?.exec(
      "UPDATE workout_sets SET status = 'Done', actual_reps = 5 WHERE id = 'new'",
    );
    expect(actions.completeSession("p", "s")).toBe(true);
    expect(status()).toBe("Done");
  });

  it("restores an edited soft-deleted exercise atomically and checks its revision", () => {
    open(
      createTestDb(
        `INSERT INTO exercises(id,name,normalized_name,position,deleted) VALUES ('old','Old','old',0,1), ('active','Taken','taken',1,0)`,
      ),
    );
    const exercise = () => read((d) => getSavedExercise(d, "old"));
    const input = {
      name: "Taken",
      loadKind: "SINGLE_WEIGHT" as const,
      barbellId: null,
      oneRepMax: null,
      primaryMuscles: [],
      notes: "new",
    };
    expect(() => actions.restoreExercise("old", 0, input)).toThrow(
      "name already exists",
    );
    expect(exercise()).toMatchObject({
      name: "Old",
      notes: null,
      deleted: true,
      revision: 0,
    });
    actions.restoreExercise("old", 0, { ...input, name: "Recovered" });
    expect(exercise()).toMatchObject({
      name: "Recovered",
      notes: "new",
      deleted: false,
      revision: 2,
    });
    expect(() => actions.setExerciseDeleted("old", true, 0)).toThrow(
      "exercise changed",
    );
    expect(exercise()?.deleted).toBe(false);
  });

  it("rejects equipment and muscle edits made from a stale form", () => {
    open(createTestDb());
    const initialEquipment = read(getEquipment);
    const initialMuscles = read(listMuscleCatalog);
    const updated = {
      barbells: [{ barbellId: "1", value: 45, unit: "lbs" as const }],
      plates: [],
    };
    actions.replaceEquipmentInventory(updated, initialEquipment);
    actions.replaceMuscles(["Chest"], initialMuscles);
    expect(() =>
      actions.replaceEquipmentInventory(
        { barbells: [], plates: [] },
        initialEquipment,
      ),
    ).toThrow("Equipment changed");
    expect(() => actions.replaceMuscles(["Back"], initialMuscles)).toThrow(
      "Muscle groups changed",
    );
    expect(read(getEquipment)).toEqual(updated);
    expect(read(listMuscleCatalog)).toEqual(["Chest"]);
  });
});
