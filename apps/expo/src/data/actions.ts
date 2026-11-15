import type { Equipment } from "@activity-log/ui/utils";

import type { Db } from "./database/db";
import type { Conversion } from "./legacy/population";
import type { ExerciseInput } from "./repositories/exercises";
import type {
  SessionDraft,
  TemplateSource,
} from "./repositories/session-drafts";
import type {
  SetMeasurements,
  SetRecording,
  SetRecordingPatch,
  SetReference,
} from "./repositories/sets";
import { buildPortableDataV2, readPortableFactsV2 } from "./backup/export-v2";
import { serializePortableBackupV2 } from "./backup/portable-v2";
import { transaction } from "./database/db";
import { defaultDomainData, replaceDomainData } from "./lifecycle/replace";
import {
  listMuscleCatalog,
  replaceMuscleCatalog,
} from "./repositories/catalog";
import { getEquipment, replaceEquipment } from "./repositories/equipment";
import * as exercises from "./repositories/exercises";
import { materializeExercisePreset as materializePreset } from "./repositories/materialize-preset";
import * as programs from "./repositories/programs";
import {
  createPlannedSession,
  saveSessionDraft,
} from "./repositories/session-drafts";
import * as lifecycle from "./repositories/session-lifecycle";
import * as sets from "./repositories/sets";
import { getDb, read, refresh, replaceDataset, write } from "./store";

/*
 * Every user-initiated change. Each runs synchronously in one transaction and
 * refreshes mounted screens when it commits.
 */

function sameList<T>(
  a: readonly T[],
  b: readonly T[],
  same: (x: T, y: T) => boolean,
) {
  return a.length === b.length && a.every((item, i) => same(item, b[i] as T));
}

// Dataset

export function exportBackup() {
  const data = read((db) => buildPortableDataV2(readPortableFactsV2(db)));
  return serializePortableBackupV2(data, Date.now());
}

export function resetApplicationData() {
  replaceDataset((db) => replaceDomainData(db, defaultDomainData()));
}

export function restoreApplicationData(prepared: Conversion) {
  replaceDataset((db) => replaceDomainData(db, prepared));
}

// Programs

export function createProgram(id: string, name: string) {
  write((db) => programs.createProgram(db, id, name));
}

export function renameProgram(id: string, name: string) {
  write((db) => programs.renameProgram(db, id, name));
}

export function deleteProgram(id: string) {
  write((db) => programs.deleteProgram(db, id));
}

// Settings

/** `expected` is the list the form was opened with; reject stale edits. */
export function replaceMuscles(
  muscles: string[],
  expected?: readonly string[],
) {
  write((db) => {
    if (expected && !sameList(listMuscleCatalog(db), expected, Object.is))
      throw new Error(
        "Muscle groups changed. Reopen this screen before saving.",
      );
    replaceMuscleCatalog(db, muscles);
  });
}

/** `expected` is the equipment the form was opened with; reject stale edits. */
export function replaceEquipmentInventory(
  equipment: Equipment,
  expected?: Equipment,
) {
  write((db) => {
    const current = getEquipment(db);
    if (
      expected &&
      !(
        sameList(
          current.barbells,
          expected.barbells,
          (a, b) =>
            a.barbellId === b.barbellId &&
            a.value === b.value &&
            a.unit === b.unit,
        ) &&
        sameList(
          current.plates,
          expected.plates,
          (a, b) =>
            a.plateId === b.plateId &&
            a.value === b.value &&
            a.unit === b.unit &&
            a.quantity === b.quantity,
        )
      )
    )
      throw new Error("Equipment changed. Reopen this screen before saving.");
    replaceEquipment(db, equipment);
  });
}

// Exercises

/** Returns the saved exercise's ID, creating it from the preset if needed. */
export function materializeExercisePreset(presetId: string, newId: string) {
  return write((db) => materializePreset(db, presetId, newId)).id;
}

export function createExercise(id: string, input: ExerciseInput) {
  write((db) => exercises.createExercise(db, id, input));
}

export function editExercise(
  id: string,
  revision: number,
  input: ExerciseInput,
) {
  write((db) => exercises.editExercise(db, id, revision, input));
}

export function setExerciseDeleted(
  id: string,
  deleted: boolean,
  expectedRevision?: number,
) {
  return write((db) =>
    exercises.setExerciseDeleted(db, id, deleted, expectedRevision),
  );
}

export function restoreExercise(
  id: string,
  revision: number,
  input: ExerciseInput,
) {
  write((db) => {
    exercises.editExercise(db, id, revision, input);
    exercises.setExerciseDeleted(db, id, false);
  });
}

export function setExerciseNotes(id: string, notes: string | null) {
  return write((db) => exercises.setExerciseNotes(db, id, notes));
}

export function setExerciseOneRepMax(
  id: string,
  weight: ExerciseInput["oneRepMax"],
  expected?: ExerciseInput["oneRepMax"],
) {
  return write((db) =>
    exercises.setExerciseOneRepMax(db, id, weight, expected),
  );
}

// Sessions

function sessionStatus(db: Db, programId: string, sessionId: string) {
  return db.getFirstSync<{ status: string }>(
    "SELECT status FROM sessions WHERE program_id = ? AND id = ?",
    programId,
    sessionId,
  )?.status;
}

export function createSession(
  programId: string,
  sessionId: string,
  draft: SessionDraft,
  template: TemplateSource | null,
) {
  write((db) =>
    createPlannedSession(db, programId, sessionId, draft, template, Date.now()),
  );
}

export function saveSession(
  programId: string,
  sessionId: string,
  baseRevision: number,
  draft: SessionDraft,
  renameLineage: boolean,
) {
  write((db) =>
    saveSessionDraft(
      db,
      programId,
      sessionId,
      baseRevision,
      draft,
      renameLineage,
      Date.now(),
    ),
  );
}

export function saveAndCompleteSession(
  programId: string,
  sessionId: string,
  baseRevision: number,
  draft: SessionDraft,
) {
  const now = Date.now();
  write((db) => {
    if (sessionStatus(db, programId, sessionId) !== "Ready")
      throw new Error("Session cannot be completed.");
    saveSessionDraft(db, programId, sessionId, baseRevision, draft, false, now);
    if (!lifecycle.completeSession(db, programId, sessionId, now, now))
      throw new Error("Session cannot be completed.");
  });
}

/**
 * Complete a Ready session whose sets are all recorded, or acknowledge one
 * that already timed out. Returns false when the session can't be completed.
 */
export function completeSession(programId: string, sessionId: string) {
  const now = Date.now();
  return write((db) => {
    const current = db.getFirstSync<{
      status: string;
      hasActivities: number;
      hasPendingSets: number;
    }>(
      `SELECT s.status,
         EXISTS(SELECT 1 FROM activities a WHERE a.program_id = s.program_id AND a.session_id = s.id) AS hasActivities,
         EXISTS(SELECT 1 FROM workout_sets w WHERE w.program_id = s.program_id AND w.session_id = s.id
           AND (w.status <> 'Done' OR w.actual_reps IS NULL OR w.actual_reps <= 0)) AS hasPendingSets
       FROM sessions s WHERE s.program_id = ? AND s.id = ?`,
      programId,
      sessionId,
    );
    if (
      !current ||
      (current.status === "Ready" &&
        (!current.hasActivities || current.hasPendingSets))
    )
      return false;
    return lifecycle.completeSession(db, programId, sessionId, now, now);
  });
}

export function resetSession(
  programId: string,
  sessionId: string,
  baseRevision: number,
) {
  write((db) =>
    lifecycle.resetSession(db, programId, sessionId, baseRevision, Date.now()),
  );
}

export function deleteSession(
  programId: string,
  sessionId: string,
  baseRevision: number,
) {
  write((db) =>
    lifecycle.deleteSession(db, programId, sessionId, baseRevision),
  );
}

export function setSessionDeload(
  programId: string,
  sessionId: string,
  deload: boolean,
) {
  write((db) =>
    lifecycle.setSessionDeload(db, programId, sessionId, deload, Date.now()),
  );
}

/**
 * Finish sessions left Ready past the inactivity timeout. Runs on a timer, so
 * it only refreshes screens when something actually expired.
 */
export function cleanupInactiveSessions() {
  const db = getDb();
  const expired = transaction(db, () =>
    lifecycle.cleanupInactiveSessions(db, Date.now()),
  );
  if (expired.length) refresh();
  return expired;
}

// Sets

export function saveSet(reference: SetReference, recording: SetRecording) {
  write((db) => sets.saveSetRecording(db, reference, recording, Date.now()));
}

export function patchSet(reference: SetReference, patch: SetRecordingPatch) {
  return write((db) =>
    sets.patchSetRecording(db, reference, patch, Date.now()),
  );
}

export function reconcileSet(
  reference: SetReference,
  actualReps: number | null,
) {
  return write((db) =>
    sets.reconcileTerminalSet(db, reference, actualReps, Date.now()),
  );
}

export function startSet(
  reference: SetReference,
  measurements: SetMeasurements,
) {
  write((db) => sets.startSet(db, reference, measurements, Date.now()));
}

/** Returns the ID of the next set to perform, if any. */
export function completeSet(
  reference: SetReference,
  measurements: SetMeasurements,
) {
  return write((db) =>
    sets.completeSetAndAdvance(db, reference, measurements, Date.now()),
  );
}
