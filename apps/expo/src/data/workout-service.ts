import type { QueryClient } from "@tanstack/react-query";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Equipment } from "@activity-log/ui/utils";

import type { WorkoutChange } from "./cache/invalidation";
import type { openApplicationDatabase } from "./database/connections";
import type { ProgramWeekRequest } from "./domain/program-timeline";
import type { ExerciseInput } from "./repositories/exercises";
import type {
  SessionDraft,
  TemplateSource,
} from "./repositories/session-drafts";
import type {
  SetMeasurements,
  SetRecording,
  SetReference,
} from "./repositories/sets";
import { invalidateWorkoutChange } from "./cache/invalidation";
import { workoutKeys } from "./cache/keys";
import { buildProgramOverview } from "./domain/program-timeline";
import {
  listExercisePresets,
  listMuscleCatalog,
  replaceMuscleCatalog,
} from "./repositories/catalog";
import { getEquipment, replaceEquipment } from "./repositories/equipment";
import {
  createExercise,
  editExercise,
  getSavedExercise,
  isExerciseUsed,
  listSavedExercises,
  setExerciseDeleted,
  setExerciseNotes,
} from "./repositories/exercises";
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
import {
  cleanupInactiveSessions,
  completeSession,
  deleteSession,
  setSessionDeload,
} from "./repositories/session-lifecycle";
import { getSetExecutionContext } from "./repositories/set-context";
import {
  completeSetAndAdvance,
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

  function publish(change: WorkoutChange) {
    void invalidateWorkoutChange(cache, change).catch(onCacheError);
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
    listPrograms: () => read(listProgramSummaries),
    programHeader: (programId: string) =>
      read((transaction) => getProgramHeader(transaction, programId)),
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
    templateChoices: (programId: string) =>
      read((transaction) => listTemplateChoices(transaction, programId)),
    resolveTemplateChoice: (programId: string, sessionId: string) =>
      read((transaction) =>
        resolveTemplateChoice(transaction, programId, sessionId),
      ),
    listExercisePresets: () => read(listExercisePresets),
    listMuscles: () => read(listMuscleCatalog),
    replaceMuscles: async (muscles: string[]) => {
      const changes = await write(async (transaction) => {
        const ids = await replaceMuscleCatalog(transaction, muscles);
        const affected: { id: string; programs: string[] }[] = [];
        for (const id of ids)
          affected.push({
            id,
            programs: await affectedPrograms(transaction, id),
          });
        return affected;
      });
      publish({ type: "muscle-catalog", generation });
      changes.forEach(({ id, programs }) =>
        publish({
          type: "exercise-metadata",
          generation,
          exerciseId: id,
          affectedPrograms: programs,
        }),
      );
    },
    equipment: () => read(getEquipment),
    replaceEquipment: async (equipment: Equipment) => {
      const affected = await write(async (transaction) => {
        const previous = await getEquipment(transaction);
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
      publish({
        type: "equipment",
        generation,
        affectedExercises: affected.exercises,
        affectedPrograms: affected.programs,
      });
    },
    listExercises: () => read(listSavedExercises),
    exercise: (id: string) =>
      read((transaction) => getSavedExercise(transaction, id)),
    exerciseUsed: (id: string) =>
      read((transaction) => isExerciseUsed(transaction, id)),
    createExercise: async (id: string, input: ExerciseInput) => {
      await write((transaction) => createExercise(transaction, id, input));
      publish({
        type: "exercise-metadata",
        generation,
        exerciseId: id,
        affectedPrograms: [],
      });
    },
    editExercise: async (
      id: string,
      revision: number,
      input: ExerciseInput,
    ) => {
      const programs = await write(async (transaction) => {
        await editExercise(transaction, id, revision, input);
        return affectedPrograms(transaction, id);
      });
      publish({
        type: "exercise-metadata",
        generation,
        exerciseId: id,
        affectedPrograms: programs,
      });
    },
    setExerciseDeleted: async (id: string, deleted: boolean) => {
      const programs = await write(async (transaction) => {
        if (!(await setExerciseDeleted(transaction, id, deleted))) return null;
        return affectedPrograms(transaction, id);
      });
      if (programs)
        publish({
          type: "exercise-metadata",
          generation,
          exerciseId: id,
          affectedPrograms: programs,
        });
    },
    setExerciseNotes: async (id: string, notes: string | null) => {
      const changed = await write((transaction) =>
        setExerciseNotes(transaction, id, notes),
      );
      if (changed)
        publish({ type: "exercise-notes", generation, exerciseId: id });
    },
    sessionDetail: (programId: string, sessionId: string) =>
      read((transaction) =>
        getSessionDetail(transaction, programId, sessionId),
      ),
    createProgram: async (id: string, name: string) => {
      await write((transaction) => createProgram(transaction, id, name));
      publish({ type: "program-list", generation });
    },
    renameProgram: async (id: string, name: string) => {
      await write((transaction) => renameProgram(transaction, id, name));
      publish({ type: "program-name", generation, programId: id });
    },
    deleteProgram: async (id: string) => {
      await write((transaction) => deleteProgram(transaction, id));
      publish({ type: "program-list", generation });
      cache.removeQueries({ queryKey: workoutKeys.program(generation, id) });
    },
    createSession: async (
      programId: string,
      sessionId: string,
      draft: SessionDraft,
      template: TemplateSource | null,
    ) => {
      await write((transaction) =>
        createPlannedSession(
          transaction,
          programId,
          sessionId,
          draft,
          template,
          now(),
        ),
      );
      publish({
        type: "session-structure",
        generation,
        programId,
        sessionId,
        added: true,
        affectsOtherSessions: template !== null,
      });
    },
    saveSession: async (
      programId: string,
      sessionId: string,
      baseRevision: number,
      draft: SessionDraft,
      renameLineage: boolean,
    ) => {
      await write((transaction) =>
        saveSessionDraft(
          transaction,
          programId,
          sessionId,
          baseRevision,
          draft,
          renameLineage,
          now(),
        ),
      );
      publish({
        type: "session-structure",
        generation,
        programId,
        sessionId,
        added: false,
        affectsOtherSessions: renameLineage,
      });
    },
    saveAndCompleteSession: async (
      programId: string,
      sessionId: string,
      baseRevision: number,
      draft: SessionDraft,
    ) => {
      const time = now();
      await write(async (transaction) => {
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
      });
      publish({
        type: "session-structure",
        generation,
        programId,
        sessionId,
        added: false,
        affectsOtherSessions: false,
      });
    },
    completeSession: async (programId: string, sessionId: string) => {
      const time = now();
      const completed = await write((transaction) =>
        completeSession(transaction, programId, sessionId, time, time),
      );
      if (completed)
        publish({
          type: "session-lifecycle",
          generation,
          programId,
          sessionId,
        });
      return completed;
    },
    deleteSession: async (
      programId: string,
      sessionId: string,
      baseRevision: number,
    ) => {
      await write((transaction) =>
        deleteSession(transaction, programId, sessionId, baseRevision),
      );
      publish({
        type: "session-structure",
        generation,
        programId,
        sessionId,
        added: true,
        affectsOtherSessions: true,
      });
      cache.removeQueries({
        queryKey: workoutKeys.session(generation, programId, sessionId),
      });
    },
    setSessionDeload: async (
      programId: string,
      sessionId: string,
      deload: boolean,
    ) => {
      await write((transaction) =>
        setSessionDeload(transaction, programId, sessionId, deload, now()),
      );
      publish({ type: "session-lifecycle", generation, programId, sessionId });
    },
    cleanupInactiveSessions: async () => {
      const expired = await write((transaction) =>
        cleanupInactiveSessions(transaction, now()),
      );
      expired.forEach(({ programId, sessionId }) =>
        publish({
          type: "session-lifecycle",
          generation,
          programId,
          sessionId,
        }),
      );
      return expired;
    },
    saveSet: async (reference: SetReference, recording: SetRecording) => {
      const kind = await write(async (transaction) => {
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
        return current.kind;
      });
      publish({
        type: "set-recording",
        generation,
        programId: reference.programId,
        sessionId: reference.sessionId,
        kind,
      });
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
        return changed ? set.kind : null;
      });
      if (result)
        publish({
          type: "set-recording",
          generation,
          programId: reference.programId,
          sessionId: reference.sessionId,
          kind: result,
        });
      return result !== null;
    },
    startSet: async (
      reference: SetReference,
      measurements: SetMeasurements,
    ) => {
      await write((transaction) =>
        startSet(transaction, reference, measurements, now()),
      );
      publish({
        type: "session-lifecycle",
        generation,
        programId: reference.programId,
        sessionId: reference.sessionId,
      });
    },
    completeSet: async (
      reference: SetReference,
      measurements: SetMeasurements,
    ) => {
      const next = await write((transaction) =>
        completeSetAndAdvance(transaction, reference, measurements, now()),
      );
      publish({
        type: "session-lifecycle",
        generation,
        programId: reference.programId,
        sessionId: reference.sessionId,
      });
      return next;
    },
  };
}
