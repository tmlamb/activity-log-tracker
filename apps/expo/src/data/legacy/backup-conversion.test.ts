import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  parseActivityLogBackup,
  serializeActivityLogBackup,
} from "~/utils/app-data-backup";
import { SCHEMA_V1 } from "../database/schema";
import { archiveLegacySource } from "./archive";
import { populateLegacyData, verifyAndMarkLegacyDataReady } from "./population";

function adapter(db: DatabaseSync) {
  return {
    getFirstAsync: <T>(
      sql: string,
      ...parameters: (string | number | null)[]
    ) =>
      Promise.resolve(
        (db.prepare(sql).get(...parameters) as T | undefined) ?? null,
      ),
    getAllAsync: <T>(sql: string) =>
      Promise.resolve(db.prepare(sql).all() as T[]),
    runAsync: (sql: string, ...parameters: (string | number | null)[]) =>
      Promise.resolve({
        changes: Number(db.prepare(sql).run(...parameters).changes),
      }),
    prepareAsync: (sql: string) => {
      const statement = db.prepare(sql);
      return Promise.resolve({
        executeAsync: (...parameters: (string | number | null)[]) =>
          Promise.resolve(statement.run(...parameters)),
        finalizeAsync: () => Promise.resolve(),
      });
    },
  };
}

/** A backup-based dry run never opens or modifies the app's own databases. */
async function verifyBackupConversion(contents: string) {
  const stores = parseActivityLogBackup(contents);
  const workout = stores["workout-storage"];
  const sessions = workout.programs.flatMap((program) => program.sessions);
  const activities = sessions.flatMap((session) => session.activities);
  const expected = {
    programs: workout.programs.length,
    sessions: sessions.length,
    activities: activities.length,
    workout_sets: activities.reduce(
      (total, activity) =>
        total + activity.warmupSets.length + activity.mainSets.length,
      0,
    ),
    exercises: workout.exercises.length,
    exercise_presets: stores["exercise-storage"].exercises.length,
    barbells: workout.equipment.barbells.length,
    plates: workout.equipment.plates.length,
  };
  const directory = mkdtempSync(join(process.cwd(), ".sqlite-backup-check-"));
  const path = join(directory, "converted.sqlite");
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(path);
    db.exec(`PRAGMA foreign_keys = ON; ${SCHEMA_V1} BEGIN IMMEDIATE`);
    await archiveLegacySource(
      adapter(db),
      {
        workout: JSON.stringify({ version: 2, state: workout }),
        exercises: JSON.stringify({
          version: 2,
          state: stores["exercise-storage"],
        }),
        restoreJournal: null,
      },
      "backup-dry-run",
      Date.now(),
    );
    db.exec("COMMIT; BEGIN IMMEDIATE");
    await populateLegacyData(adapter(db), 1);
    db.exec("COMMIT");
    db.close();
    db = new DatabaseSync(path);
    db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
    await verifyAndMarkLegacyDataReady(adapter(db), 1, Date.now());
    db.exec("COMMIT");
    for (const [table, count] of Object.entries(expected)) {
      expect(
        db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(),
      ).toEqual({ count });
    }
    const reportRow = db
      .prepare("SELECT report FROM conversion_reports WHERE snapshot_id = 1")
      .get() as { report: string } | undefined;
    if (!reportRow) throw new Error("The conversion report is missing.");
    const report = JSON.parse(reportRow.report) as {
      repairs: { reason: string }[];
      identities: { pointer: string; reason: string }[];
    };
    const repairCounts: Record<string, number> = {};
    for (const { reason } of report.repairs)
      repairCounts[reason] = (repairCounts[reason] ?? 0) + 1;
    const remappedIds = report.identities.filter(
      ({ pointer, reason }) =>
        reason !== "unchanged" && !pointer.startsWith("/presets/"),
    ).length;
    return { counts: expected, repairCounts, remappedIds };
  } finally {
    db?.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("portable backup conversion dry run", () => {
  it("converts and verifies a representative official backup", async () => {
    const backup = serializeActivityLogBackup({
      "workout-storage": {
        programs: [
          {
            programId: "p",
            name: "Program",
            sessions: [
              {
                sessionId: "s",
                name: "Session",
                deload: false,
                status: "Done",
                activities: [
                  {
                    activityId: "a",
                    exerciseId: "e",
                    reps: 5,
                    rest: 2,
                    load: { type: "RPE", value: 8 },
                    warmupSets: [],
                    mainSets: [
                      {
                        workoutSetId: "set",
                        type: "Main",
                        status: "Done",
                        feedback: "Neutral",
                        actualReps: 5,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        exercises: [
          { exerciseId: "e", name: "Exercise", loadKind: "SINGLE_WEIGHT" },
        ],
        equipment: { barbells: [], plates: [] },
        muscleGroups: [],
      },
      "exercise-storage": { exercises: [] },
    });
    expect(await verifyBackupConversion(backup)).toMatchObject({
      counts: {
        programs: 1,
        sessions: 1,
        activities: 1,
        workout_sets: 1,
        exercises: 1,
      },
    });
  });

  const userBackup = process.env.ACTIVITY_LOG_MIGRATION_BACKUP;
  it.runIf(Boolean(userBackup))(
    "converts and verifies the supplied backup",
    async () => {
      if (!userBackup)
        throw new Error(
          "Set ACTIVITY_LOG_MIGRATION_BACKUP to an exported backup file.",
        );
      const start = Date.now();
      const result = await verifyBackupConversion(
        readFileSync(userBackup, "utf8"),
      );
      console.info("Verified backup conversion:", {
        ...result,
        elapsedMs: Date.now() - start,
      });
    },
  );
});
