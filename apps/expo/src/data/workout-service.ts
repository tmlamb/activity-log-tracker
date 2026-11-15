import type { QueryClient } from "@tanstack/react-query";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Equipment } from "@activity-log/ui/utils";
import {
  normalizeMuscleGroups,
  normalizeSingleLineText,
} from "@activity-log/ui/utils";

import type { MemoryChange } from "./application-memory";
import type { prepareApplicationRestore } from "./backup/prepare-restore";
import type { prepareVersion2Restore } from "./backup/restore-v2";
import type { WorkoutChange } from "./cache/invalidation";
import type { openApplicationDatabase } from "./database/connections";
import type { ProgramWeekRequest } from "./domain/program-timeline";
import type { prepareVersion1Restore } from "./lifecycle/restore-v1";
import type { ExerciseInput } from "./repositories/exercises";
import type {
  PlanningWeightActivity,
  PlanningWeightSource,
} from "./repositories/planning-weights";
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
import { restoreVersion2Data } from "./backup/restore-v2";
import { invalidateWorkoutChange } from "./cache/invalidation";
import { workoutKeys } from "./cache/keys";
import { calculateDeloadCandidate } from "./domain/deload-candidate";
import { buildExerciseSeriesProjection } from "./domain/exercise-series";
import { buildProgramInsightProjection } from "./domain/program-insights";
import { buildProgramOverview } from "./domain/program-timeline";
import { resetApplicationData } from "./lifecycle/reset";
import { restoreVersion1Data } from "./lifecycle/restore-v1";
import {
  listExercisePresets,
  listMuscleCatalog,
  replaceMuscleCatalog,
} from "./repositories/catalog";
import { readDeloadCandidateFacts } from "./repositories/deload-candidate";
import { getEquipment, replaceEquipment } from "./repositories/equipment";
import { readExerciseSeriesFacts } from "./repositories/exercise-series";
import {
  createExercise,
  editExercise,
  getSavedExercise,
  isExerciseUsed,
  listSavedExercises,
  setExerciseDeleted,
  setExerciseNotes,
  setExerciseOneRepMax,
} from "./repositories/exercises";
import { materializeExercisePreset } from "./repositories/materialize-preset";
import { getPlanningWeightHints } from "./repositories/planning-weights";
import { readProgramInsightFacts } from "./repositories/program-insights";
import {
  getProgramHeader,
  getProgramWeekPage,
  readProgramTimeline,
} from "./repositories/program-timeline";
import {
  createProgram,
  deleteProgram,
  listProgramSummaries,
  renameProgram,
} from "./repositories/programs";
import { getSessionDetail } from "./repositories/session-detail";
import {
  createPlannedSession,
  saveSessionDraft,
} from "./repositories/session-drafts";
import { getSessionEditorSeed } from "./repositories/session-editor";
import {
  cleanupInactiveSessions,
  completeSession,
  deleteSession,
  resetSession,
  setSessionDeload,
} from "./repositories/session-lifecycle";
import { getSessionPolicy } from "./repositories/session-policy";
import { getSetExecutionContext } from "./repositories/set-context";
import {
  completeSetAndAdvance,
  patchSetRecording,
  reconcileTerminalSet,
  saveSetRecording,
  startSet,
} from "./repositories/sets";
import {
  listTemplateChoices,
  resolveTemplateChoice,
} from "./repositories/templates";

type Database = Awaited<ReturnType<typeof openApplicationDatabase>>;

/** Data-service lifetime is scoped to one database and dataset generation. */
export function createWorkoutService(
  database: Database,
  cache: QueryClient,
  generation: number,
  onCacheError: (error: unknown) => void,
  now: () => number = Date.now,
  onCommittedChange: (
    change: WorkoutChange,
    memoryChange?: MemoryChange,
  ) => void = () => undefined,
) {
  async function assertGeneration(transaction: SQLiteDatabase) {
    const state = await transaction.getFirstAsync<{
      generation: number;
      state: string;
    }>("SELECT generation, state FROM bootstrap_state WHERE singleton = 1");
    if (state?.state !== "ready" || state.generation !== generation) {
      throw new Error("The workout dataset has changed. Reopen this screen.");
    }
  }

  function read<T>(job: (transaction: SQLiteDatabase) => Promise<T>) {
    return database.read(async (transaction) => {
      await assertGeneration(transaction);
      return job(transaction);
    });
  }

  function write<T>(job: (transaction: SQLiteDatabase) => Promise<T>) {
    return database.write(async (transaction) => {
      await assertGeneration(transaction);
      return job(transaction);
    });
  }

  async function changedSession(
    transaction: SQLiteDatabase,
    programId: string,
    sessionId: string,
  ) {
    const detail = await getSessionDetail(transaction, programId, sessionId);
    if (!detail) throw new Error("The changed session could not be read.");
    return detail;
  }

  async function changedExercise(transaction: SQLiteDatabase, id: string) {
    const exercise = await getSavedExercise(transaction, id);
    if (!exercise) throw new Error("The changed exercise could not be read.");
    return exercise;
  }

  function reportCacheError(error: unknown) {
    try {
      onCacheError(error);
    } catch {
      // Reporting cannot undo or change the outcome of a committed write.
    }
  }

  function publish(change: WorkoutChange, memoryChange?: MemoryChange) {
    const invalidation = invalidateWorkoutChange(cache, change);
    try {
      onCommittedChange(change, memoryChange);
    } catch (error) {
      reportCacheError(error);
    }
    void invalidation.catch(reportCacheError);
  }

  async function clearReplacedGeneration() {
    try {
      await cache.cancelQueries({ queryKey: workoutKeys.root(generation) });
    } catch (error) {
      reportCacheError(error);
    }
    try {
      cache.removeQueries({ queryKey: workoutKeys.root(generation) });
    } catch (error) {
      reportCacheError(error);
    }
  }

  async function affectedPrograms(
    transaction: SQLiteDatabase,
    exerciseId: string,
  ) {
    const rows = await transaction.getAllAsync<{ id: string }>(
      "SELECT DISTINCT program_id AS id FROM activities WHERE exercise_id = ?",
      exerciseId,
    );
    return rows.map(({ id }) => id);
  }

  return {
    exportBackupV2: async () => {
      const createdAtMs = now();
      const facts = await read(readPortableFactsV2);
      const data = buildPortableDataV2(facts);
      return serializePortableBackupV2(data, createdAtMs);
    },
    resetApplicationData: async () => {
      const nextGeneration = await write((transaction) =>
        resetApplicationData(transaction, generation),
      );
      await clearReplacedGeneration();
      return nextGeneration;
    },
    restoreVersion1: async (
      prepared: ReturnType<typeof prepareVersion1Restore>,
    ) => {
      const nextGeneration = await write((transaction) =>
        restoreVersion1Data(transaction, generation, prepared),
      );
      await clearReplacedGeneration();
      return nextGeneration;
    },
    restoreVersion2: async (
      prepared: ReturnType<typeof prepareVersion2Restore>,
    ) => {
      const nextGeneration = await write((transaction) =>
        restoreVersion2Data(transaction, generation, prepared),
      );
      await clearReplacedGeneration();
      return nextGeneration;
    },
    restoreApplicationData: async (
      prepared: ReturnType<typeof prepareApplicationRestore>,
    ) => {
      const nextGeneration = await write((transaction) =>
        prepared.version === 1
          ? restoreVersion1Data(transaction, generation, prepared.data)
          : restoreVersion2Data(transaction, generation, prepared.data),
      );
      await clearReplacedGeneration();
      return nextGeneration;
    },
    listPrograms: () => read(listProgramSummaries),
    programHeader: (programId: string) =>
      read((transaction) => getProgramHeader(transaction, programId)),
    programInsights: (programId: string) => {
      const nowMs = now();
      return read((transaction) =>
        readProgramInsightFacts(transaction, programId),
      ).then((facts) =>
        facts ? buildProgramInsightProjection(facts, nowMs) : null,
      );
    },
    programOverview: (programId: string) => {
      const nowMs = now();
      return read((transaction) =>
        readProgramTimeline(transaction, programId),
      ).then((facts) =>
        facts ? buildProgramOverview(facts.anchor, facts.dates, nowMs) : null,
      );
    },
    programWeek: (
      programId: string,
      request: Omit<ProgramWeekRequest, "nowMs">,
    ) => {
      const nowMs = now();
      return read((transaction) =>
        getProgramWeekPage(transaction, programId, { ...request, nowMs }),
      );
    },
    setContext: (reference: SetReference) =>
      read((transaction) => getSetExecutionContext(transaction, reference)),
    exerciseSeries: (reference: SetReference) => {
      const nowMs = now();
      return read((transaction) =>
        readExerciseSeriesFacts(transaction, reference),
      ).then((facts) =>
        facts ? buildExerciseSeriesProjection(facts, nowMs) : null,
      );
    },
    templateChoices: (programId: string) =>
      read((transaction) => listTemplateChoices(transaction, programId)),
    planningWeightHints: (
      programId: string,
      source: PlanningWeightSource,
      activities: readonly PlanningWeightActivity[],
      kind: "Warmup" | "Main",
    ) =>
      read((transaction) =>
        getPlanningWeightHints(
          transaction,
          programId,
          source,
          activities,
          kind,
        ),
      ),
    resolveTemplateChoice: (programId: string, sessionId: string) =>
      read((transaction) =>
        resolveTemplateChoice(transaction, programId, sessionId),
      ),
    listExercisePresets: () => read(listExercisePresets),
    materializeExercisePreset: async (presetId: string, newId: string) => {
      const { result, exercise } = await write(async (transaction) => {
        const result = await materializeExercisePreset(
          transaction,
          presetId,
          newId,
        );
        return {
          result,
          exercise: result.created
            ? await changedExercise(transaction, result.id)
            : null,
        };
      });
      if (result.created)
        publish(
          {
            type: "exercise-metadata",
            generation,
            exerciseId: result.id,
            affectedPrograms: [],
          },
          exercise ? { type: "exercise-record", exercise } : undefined,
        );
      return result.id;
    },
    exerciseLibrary: () =>
      read(async (transaction) => ({
        saved: await listSavedExercises(transaction),
        presets: await listExercisePresets(transaction),
      })),
    listMuscles: () => read(listMuscleCatalog),
    replaceMuscles: async (muscles: string[], expected?: readonly string[]) => {
      const changes = await write(async (transaction) => {
        if (expected) {
          const current = await listMuscleCatalog(transaction);
          if (
            current.length !== expected.length ||
            current.some((name, index) => name !== expected[index])
          )
            throw new Error(
              "Muscle groups changed. Reopen this screen before saving.",
            );
        }
        const ids = await replaceMuscleCatalog(transaction, muscles);
        const affected: { id: string; programs: string[] }[] = [];
        for (const id of ids)
          affected.push({
            id,
            programs: await affectedPrograms(transaction, id),
          });
        return affected;
      });
      publish(
        { type: "muscle-catalog", generation },
        {
          type: "muscles",
          muscles: normalizeMuscleGroups(muscles).sort((a, b) =>
            a.localeCompare(b),
          ),
        },
      );
      changes.forEach(({ id, programs }) =>
        publish(
          {
            type: "exercise-metadata",
            generation,
            exerciseId: id,
            affectedPrograms: programs,
          },
          { type: "already-applied" },
        ),
      );
    },
    equipment: () => read(getEquipment),
    replaceEquipment: async (equipment: Equipment, expected?: Equipment) => {
      const affected = await write(async (transaction) => {
        const previous = await getEquipment(transaction);
        if (
          expected &&
          (previous.barbells.length !== expected.barbells.length ||
            previous.plates.length !== expected.plates.length ||
            previous.barbells.some((item, index) => {
              const original = expected.barbells[index];
              return (
                item.barbellId !== original?.barbellId ||
                item.value !== original.value ||
                item.unit !== original.unit
              );
            }) ||
            previous.plates.some((item, index) => {
              const original = expected.plates[index];
              return (
                item.plateId !== original?.plateId ||
                item.value !== original.value ||
                item.unit !== original.unit ||
                item.quantity !== original.quantity
              );
            }))
        )
          throw new Error(
            "Equipment changed. Reopen this screen before saving.",
          );
        const nextById = new Map(
          equipment.barbells.map((item) => [item.barbellId, item]),
        );
        const changed = new Set(
          previous.barbells
            .filter((item) => {
              const next = nextById.get(item.barbellId);
              return next?.value !== item.value || next.unit !== item.unit;
            })
            .map((item) => item.barbellId),
        );
        const references = await transaction.getAllAsync<{
          exerciseId: string;
          barbellId: string;
          programId: string | null;
        }>(
          `SELECT DISTINCT e.id AS exerciseId, e.barbell_id AS barbellId, a.program_id AS programId
           FROM exercises e LEFT JOIN activities a ON a.exercise_id = e.id WHERE e.barbell_id IS NOT NULL`,
        );
        const relevant = references.filter(({ barbellId }) =>
          changed.has(barbellId),
        );
        await replaceEquipment(transaction, equipment);
        return {
          exercises: [...new Set(relevant.map(({ exerciseId }) => exerciseId))],
          programs: [
            ...new Set(
              relevant.flatMap(({ programId }) =>
                programId === null ? [] : [programId],
              ),
            ),
          ],
        };
      });
      publish(
        {
          type: "equipment",
          generation,
          affectedExercises: affected.exercises,
          affectedPrograms: affected.programs,
        },
        { type: "equipment", equipment },
      );
    },
    listExercises: () => read(listSavedExercises),
    exercise: (id: string) =>
      read((transaction) => getSavedExercise(transaction, id)),
    exerciseUsed: (id: string) =>
      read((transaction) => isExerciseUsed(transaction, id)),
    createExercise: async (id: string, input: ExerciseInput) => {
      const exercise = await write(async (transaction) => {
        await createExercise(transaction, id, input);
        return changedExercise(transaction, id);
      });
      publish(
        {
          type: "exercise-metadata",
          generation,
          exerciseId: id,
          affectedPrograms: [],
        },
        { type: "exercise-record", exercise },
      );
    },
    editExercise: async (
      id: string,
      revision: number,
      input: ExerciseInput,
    ) => {
      const result = await write(async (transaction) => {
        await editExercise(transaction, id, revision, input);
        return {
          programs: await affectedPrograms(transaction, id),
          exercise: await changedExercise(transaction, id),
        };
      });
      publish(
        {
          type: "exercise-metadata",
          generation,
          exerciseId: id,
          affectedPrograms: result.programs,
        },
        { type: "exercise-record", exercise: result.exercise },
      );
    },
    setExerciseDeleted: async (
      id: string,
      deleted: boolean,
      expectedRevision?: number,
    ) => {
      const result = await write(async (transaction) => {
        if (
          !(await setExerciseDeleted(
            transaction,
            id,
            deleted,
            expectedRevision,
          ))
        )
          return null;
        return {
          programs: await affectedPrograms(transaction, id),
          exercise: await changedExercise(transaction, id),
        };
      });
      if (result)
        publish(
          {
            type: "exercise-metadata",
            generation,
            exerciseId: id,
            affectedPrograms: result.programs,
          },
          { type: "exercise-record", exercise: result.exercise },
        );
    },
    restoreExercise: async (
      id: string,
      revision: number,
      input: ExerciseInput,
    ) => {
      const result = await write(async (transaction) => {
        await editExercise(transaction, id, revision, input);
        await setExerciseDeleted(transaction, id, false);
        return {
          programs: await affectedPrograms(transaction, id),
          exercise: await changedExercise(transaction, id),
        };
      });
      publish(
        {
          type: "exercise-metadata",
          generation,
          exerciseId: id,
          affectedPrograms: result.programs,
        },
        { type: "exercise-record", exercise: result.exercise },
      );
    },
    setExerciseNotes: async (id: string, notes: string | null) => {
      const changed = await write((transaction) =>
        setExerciseNotes(transaction, id, notes),
      );
      if (changed)
        publish(
          { type: "exercise-notes", generation, exerciseId: id },
          { type: "exercise-notes", exerciseId: id, notes },
        );
    },
    setExerciseOneRepMax: async (
      id: string,
      weight: ExerciseInput["oneRepMax"],
      expected?: ExerciseInput["oneRepMax"],
    ) => {
      const result = await write(async (transaction) => {
        if (!(await setExerciseOneRepMax(transaction, id, weight, expected)))
          return null;
        return {
          programs: await affectedPrograms(transaction, id),
          exercise: await changedExercise(transaction, id),
        };
      });
      if (result)
        publish(
          {
            type: "exercise-metadata",
            generation,
            exerciseId: id,
            affectedPrograms: result.programs,
          },
          { type: "exercise-record", exercise: result.exercise },
        );
    },
    sessionDetail: (programId: string, sessionId: string) =>
      read((transaction) =>
        getSessionDetail(transaction, programId, sessionId),
      ),
    sessionEditorSeed: (programId: string, sessionId: string | null) =>
      read((transaction) =>
        getSessionEditorSeed(transaction, generation, programId, sessionId),
      ),
    sessionPolicy: (programId: string, sessionId: string) =>
      read((transaction) =>
        getSessionPolicy(transaction, programId, sessionId),
      ),
    sessionDeloadCandidate: (programId: string, sessionId: string) =>
      read((transaction) =>
        readDeloadCandidateFacts(transaction, programId, sessionId),
      ).then((facts) => (facts ? calculateDeloadCandidate(facts) : null)),
    createProgram: async (id: string, name: string) => {
      await write((transaction) => createProgram(transaction, id, name));
      publish(
        { type: "program-list", generation },
        {
          type: "create-program",
          programId: id,
          name: normalizeSingleLineText(name),
        },
      );
    },
    renameProgram: async (id: string, name: string) => {
      await write((transaction) => renameProgram(transaction, id, name));
      publish(
        { type: "program-name", generation, programId: id },
        {
          type: "program-name",
          programId: id,
          name: normalizeSingleLineText(name),
        },
      );
    },
    deleteProgram: async (id: string) => {
      await write((transaction) => deleteProgram(transaction, id));
      publish(
        { type: "program-list", generation },
        { type: "delete-program", programId: id },
      );
      cache.removeQueries({ queryKey: workoutKeys.program(generation, id) });
    },
    createSession: async (
      programId: string,
      sessionId: string,
      draft: SessionDraft,
      template: TemplateSource | null,
    ) => {
      const changed = await write(async (transaction) => {
        await createPlannedSession(
          transaction,
          programId,
          sessionId,
          draft,
          template,
          now(),
        );
        const source = template
          ? [await changedSession(transaction, programId, template.sessionId)]
          : [];
        return [
          ...source,
          await changedSession(transaction, programId, sessionId),
        ];
      });
      publish(
        {
          type: "session-structure",
          generation,
          programId,
          sessionId,
          added: true,
          affectsOtherSessions: template !== null,
        },
        { type: "replace-sessions", sessions: changed },
      );
    },
    saveSession: async (
      programId: string,
      sessionId: string,
      baseRevision: number,
      draft: SessionDraft,
      renameLineage: boolean,
    ) => {
      const changed = await write(async (transaction) => {
        await saveSessionDraft(
          transaction,
          programId,
          sessionId,
          baseRevision,
          draft,
          renameLineage,
          now(),
        );
        return changedSession(transaction, programId, sessionId);
      });
      publish(
        {
          type: "session-structure",
          generation,
          programId,
          sessionId,
          added: false,
          affectsOtherSessions: renameLineage,
        },
        { type: "replace-sessions", sessions: [changed], renameLineage },
      );
    },
    saveAndCompleteSession: async (
      programId: string,
      sessionId: string,
      baseRevision: number,
      draft: SessionDraft,
    ) => {
      const time = now();
      const changed = await write(async (transaction) => {
        const current = await transaction.getFirstAsync<{ status: string }>(
          "SELECT status FROM sessions WHERE program_id = ? AND id = ?",
          programId,
          sessionId,
        );
        if (current?.status !== "Ready")
          throw new Error("Session cannot be completed.");
        await saveSessionDraft(
          transaction,
          programId,
          sessionId,
          baseRevision,
          draft,
          false,
          time,
        );
        if (
          !(await completeSession(
            transaction,
            programId,
            sessionId,
            time,
            time,
          ))
        )
          throw new Error("Session cannot be completed.");
        return changedSession(transaction, programId, sessionId);
      });
      publish(
        {
          type: "session-structure",
          generation,
          programId,
          sessionId,
          added: false,
          affectsOtherSessions: false,
        },
        { type: "replace-sessions", sessions: [changed] },
      );
    },
    completeSession: async (programId: string, sessionId: string) => {
      const time = now();
      const completed = await write(async (transaction) => {
        const current = await transaction.getFirstAsync<{
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
          return null;
        if (
          !(await completeSession(
            transaction,
            programId,
            sessionId,
            time,
            time,
          ))
        )
          return null;
        return changedSession(transaction, programId, sessionId);
      });
      if (completed)
        publish(
          {
            type: "session-lifecycle",
            generation,
            programId,
            sessionId,
          },
          { type: "replace-sessions", sessions: [completed] },
        );
      return completed !== null;
    },
    resetSession: async (
      programId: string,
      sessionId: string,
      baseRevision: number,
    ) => {
      const changed = await write(async (transaction) => {
        await resetSession(
          transaction,
          programId,
          sessionId,
          baseRevision,
          now(),
        );
        return changedSession(transaction, programId, sessionId);
      });
      publish(
        { type: "session-lifecycle", generation, programId, sessionId },
        { type: "replace-sessions", sessions: [changed] },
      );
    },
    deleteSession: async (
      programId: string,
      sessionId: string,
      baseRevision: number,
    ) => {
      await write((transaction) =>
        deleteSession(transaction, programId, sessionId, baseRevision),
      );
      publish(
        {
          type: "session-structure",
          generation,
          programId,
          sessionId,
          added: true,
          affectsOtherSessions: true,
        },
        { type: "delete-session", programId, sessionId },
      );
      cache.removeQueries({
        queryKey: workoutKeys.session(generation, programId, sessionId),
      });
    },
    setSessionDeload: async (
      programId: string,
      sessionId: string,
      deload: boolean,
    ) => {
      let changedAt = 0;
      await write((transaction) => {
        changedAt = now();
        return setSessionDeload(
          transaction,
          programId,
          sessionId,
          deload,
          changedAt,
        );
      });
      publish(
        { type: "session-lifecycle", generation, programId, sessionId },
        {
          type: "session-deload",
          programId,
          sessionId,
          deload,
          nowMs: changedAt,
        },
      );
    },
    cleanupInactiveSessions: async () => {
      const changed = await write(async (transaction) => {
        const expired = await cleanupInactiveSessions(transaction, now());
        const details = [];
        for (const { programId, sessionId } of expired)
          details.push(await changedSession(transaction, programId, sessionId));
        return details;
      });
      changed.forEach((detail) => {
        const { programId, id: sessionId } = detail;
        publish(
          {
            type: "session-lifecycle",
            generation,
            programId,
            sessionId,
          },
          { type: "replace-sessions", sessions: [detail] },
        );
      });
      return changed.map(({ programId, id }) => ({ programId, sessionId: id }));
    },
    saveSet: async (reference: SetReference, recording: SetRecording) => {
      const result = await write(async (transaction) => {
        const current = await transaction.getFirstAsync<{
          kind: "Warmup" | "Main";
        }>(
          "SELECT kind FROM workout_sets WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?",
          reference.programId,
          reference.sessionId,
          reference.activityId,
          reference.setId,
        );
        if (!current) throw new Error("Workout set not found");
        await saveSetRecording(transaction, reference, recording, now());
        return {
          kind: current.kind,
          detail: await changedSession(
            transaction,
            reference.programId,
            reference.sessionId,
          ),
        };
      });
      publish(
        {
          type: "set-recording",
          generation,
          programId: reference.programId,
          sessionId: reference.sessionId,
          kind: result.kind,
        },
        { type: "replace-sessions", sessions: [result.detail] },
      );
    },
    patchSet: async (reference: SetReference, patch: SetRecordingPatch) => {
      let updatedAt = 0;
      const result = await write(async (transaction) => {
        const current = await transaction.getFirstAsync<{
          kind: "Warmup" | "Main";
        }>(
          "SELECT kind FROM workout_sets WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?",
          reference.programId,
          reference.sessionId,
          reference.activityId,
          reference.setId,
        );
        if (!current) throw new Error("Workout set not found");
        updatedAt = now();
        const changed = await patchSetRecording(
          transaction,
          reference,
          patch,
          updatedAt,
        );
        return changed ? current.kind : null;
      });
      if (result)
        publish(
          {
            type: "set-recording",
            generation,
            programId: reference.programId,
            sessionId: reference.sessionId,
            kind: result,
          },
          { type: "patch", reference, patch, nowMs: updatedAt },
        );
      return result !== null;
    },
    reconcileSet: async (
      reference: SetReference,
      actualReps: number | null,
    ) => {
      const result = await write(async (transaction) => {
        const set = await transaction.getFirstAsync<{
          kind: "Warmup" | "Main";
        }>(
          "SELECT kind FROM workout_sets WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?",
          reference.programId,
          reference.sessionId,
          reference.activityId,
          reference.setId,
        );
        if (!set) return null;
        const changed = await reconcileTerminalSet(
          transaction,
          reference,
          actualReps,
          now(),
        );
        return changed
          ? {
              kind: set.kind,
              detail: await changedSession(
                transaction,
                reference.programId,
                reference.sessionId,
              ),
            }
          : null;
      });
      if (result)
        publish(
          {
            type: "set-recording",
            generation,
            programId: reference.programId,
            sessionId: reference.sessionId,
            kind: result.kind,
          },
          { type: "replace-sessions", sessions: [result.detail] },
        );
      return result !== null;
    },
    startSet: async (
      reference: SetReference,
      measurements: SetMeasurements,
    ) => {
      let startedAt = 0;
      await write((transaction) => {
        startedAt = now();
        return startSet(transaction, reference, measurements, startedAt);
      });
      publish(
        {
          type: "session-lifecycle",
          generation,
          programId: reference.programId,
          sessionId: reference.sessionId,
        },
        { type: "start", reference, measurements, nowMs: startedAt },
      );
    },
    completeSet: async (
      reference: SetReference,
      measurements: SetMeasurements,
    ) => {
      let completedAt = 0;
      const next = await write((transaction) => {
        completedAt = now();
        return completeSetAndAdvance(
          transaction,
          reference,
          measurements,
          completedAt,
        );
      });
      publish(
        {
          type: "session-lifecycle",
          generation,
          programId: reference.programId,
          sessionId: reference.sessionId,
        },
        {
          type: "complete",
          reference,
          measurements,
          nowMs: completedAt,
          nextId: next,
        },
      );
      return next;
    },
  };
}
