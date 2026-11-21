import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

import { buildProgramInsights } from "@activity-log/ui/utils";

import { parseActivityLogBackup } from "../../utils/app-data-backup";
import { transaction } from "../database/db";
import { createTestDb } from "../database/test-db";
import { buildProgramInsightProjection } from "../domain/program-insights";
import { presentProgramInsights } from "../insight-presenters";
import { replaceDomainData } from "../lifecycle/replace";
import { readProgramInsightFacts } from "../repositories/program-insights";
import { getSessionEditorSeed } from "../repositories/session-editor";
import { patchSetRecording } from "../repositories/sets";
import { buildPortableDataV2, readPortableFactsV2 } from "./export-v2";
import { serializePortableBackupV2 } from "./portable-v2";
import { prepareApplicationRestore } from "./prepare-restore";

describe("portable backup historical round trip", () => {
  it("retains every exported domain record through v1 import and v2 restore", () => {
    const contents = readFileSync(
      new URL("../legacy/fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );
    const source = prepareApplicationRestore(contents);
    const original = parseActivityLogBackup(contents)["workout-storage"];
    const db = createTestDb();
    try {
      transaction(db, () => replaceDomainData(db, source));
      const now = new Date(2026, 10, 13, 12);
      for (const program of original.programs) {
        const facts = readProgramInsightFacts(db, program.programId);
        if (!facts) throw new Error("A program is missing after import.");
        const actual = presentProgramInsights(
          buildProgramInsightProjection(facts, now.getTime()),
        );
        // Legacy insights have no drop sets to count separately.
        expect({
          ...actual,
          weeks: actual.weeks.map((week) => ({
            ...week,
            muscleGroups: week.muscleGroups.map(
              ({ drop: _drop, dropPending: _dropPending, ...metrics }) =>
                metrics,
            ),
          })),
        }).toEqual(buildProgramInsights(program, original.exercises, now));
      }
      const before = buildPortableDataV2(readPortableFactsV2(db));
      const seeds = before.programs.flatMap((program) =>
        [
          ...new Set([
            0,
            Math.floor(program.sessions.length / 2),
            program.sessions.length - 1,
          ]),
        ].flatMap((index) => {
          const session = program.sessions[index];
          return session
            ? [
                {
                  programId: program.id,
                  sessionId: session.id,
                  seed: getSessionEditorSeed(db, program.id, session.id),
                },
              ]
            : [];
        }),
      );
      for (const { seed } of seeds) expect(seed?.session).toBeTruthy();
      const backupV2 = serializePortableBackupV2(before, Date.now());
      const prepared = prepareApplicationRestore(backupV2);
      transaction(db, () => replaceDomainData(db, prepared));
      expect(buildPortableDataV2(readPortableFactsV2(db))).toEqual(before);
      expect(db.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      for (const { programId, sessionId, seed } of seeds)
        expect(getSessionEditorSeed(db, programId, sessionId)).toEqual(seed);
      const program = before.programs.find((item) =>
        item.sessions.some((session) =>
          session.activities.some(
            (activity) =>
              activity.mainSets.length || activity.warmupSets.length,
          ),
        ),
      );
      const session = program?.sessions.find((item) =>
        item.activities.some(
          (activity) => activity.mainSets.length || activity.warmupSets.length,
        ),
      );
      const activity = session?.activities.find(
        (item) => item.mainSets.length || item.warmupSets.length,
      );
      const set = activity?.mainSets[0] ?? activity?.warmupSets[0];
      if (!program || !session || !activity || !set)
        throw new Error("Backup has no workout set to test.");
      const reference = {
        programId: program.id,
        sessionId: session.id,
        activityId: activity.id,
        setId: set.id,
      };
      const actualReps = (set.actualReps ?? 0) + 1;
      transaction(db, () =>
        patchSetRecording(db, reference, { actualReps }, now.getTime()),
      );
      const patched = getSessionEditorSeed(
        db,
        program.id,
        session.id,
      )?.session?.activities.find(({ id }) => id === activity.id);
      expect(
        [...(patched?.mainSets ?? []), ...(patched?.warmupSets ?? [])].find(
          ({ id }) => id === set.id,
        )?.actualReps,
      ).toBe(actualReps);
    } finally {
      db.raw.close();
    }
  }, 120_000);
});
