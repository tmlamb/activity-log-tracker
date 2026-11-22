import { useCallback, useMemo } from "react";

import type { SavedExercise } from "./repositories/exercises";
import type { SetReference } from "./repositories/sets";
import { calculateDeloadCandidate } from "./domain/deload-candidate";
import { buildExerciseSeriesProjection } from "./domain/exercise-series";
import { buildProgramInsightProjection } from "./domain/program-insights";
import { buildProgramOverview } from "./domain/program-timeline";
import { listExercisePresets, listMuscleCatalog } from "./repositories/catalog";
import { readDeloadCandidateFacts } from "./repositories/deload-candidate";
import { getEquipment } from "./repositories/equipment";
import { readExerciseSeriesFacts } from "./repositories/exercise-series";
import {
  getSavedExercise,
  isExerciseUsed,
  listSavedExercises,
} from "./repositories/exercises";
import { readProgramInsightFacts } from "./repositories/program-insights";
import {
  getProgramHeader,
  getProgramWeek,
  readProgramTimeline,
} from "./repositories/program-timeline";
import { listProgramSummaries } from "./repositories/programs";
import { getSessionDetail } from "./repositories/session-detail";
import { getSessionEditorSeed } from "./repositories/session-editor";
import { getSetExecutionContext } from "./repositories/set-context";
import { listTemplateChoices } from "./repositories/templates";
import { useRead } from "./store";

/*
 * Screen data hooks. Each runs a synchronous SQLite read during render and
 * re-runs after any committed write.
 */

export function useProgramSummaries() {
  return useRead(listProgramSummaries);
}

export function useProgramHeader(programId: string | undefined) {
  return useRead(
    useCallback(
      (db) => (programId ? getProgramHeader(db, programId) : null),
      [programId],
    ),
  );
}

export function useProgramOverview(programId: string) {
  return useRead(
    useCallback(
      (db) => {
        const facts = readProgramTimeline(db, programId);
        return facts
          ? buildProgramOverview(facts.anchor, facts.dates, Date.now())
          : null;
      },
      [programId],
    ),
  );
}

export function useProgramWeek(programId: string, week: number) {
  return useRead(
    useCallback(
      (db) => getProgramWeek(db, programId, week, Date.now()),
      [programId, week],
    ),
  );
}

export function useProgramInsights(programId: string) {
  return useRead(
    useCallback(
      (db) => {
        const facts = readProgramInsightFacts(db, programId);
        return facts ? buildProgramInsightProjection(facts, Date.now()) : null;
      },
      [programId],
    ),
  );
}

export function useSessionEditorSeed(
  programId: string,
  sessionId: string | null,
) {
  return useRead(
    useCallback(
      (db) => getSessionEditorSeed(db, programId, sessionId),
      [programId, sessionId],
    ),
  );
}

export function useSessionDetail(programId: string, sessionId: string) {
  return useRead(
    useCallback(
      (db) => getSessionDetail(db, programId, sessionId),
      [programId, sessionId],
    ),
  );
}

export function useSessionDeloadCandidate(
  programId: string,
  sessionId: string,
  enabled: boolean,
) {
  return useRead(
    useCallback(
      (db) => {
        if (!enabled) return null;
        const facts = readDeloadCandidateFacts(db, programId, sessionId);
        return facts ? calculateDeloadCandidate(facts) : null;
      },
      [programId, sessionId, enabled],
    ),
  );
}

export function useTemplateChoices(programId: string) {
  return useRead(
    useCallback((db) => listTemplateChoices(db, programId), [programId]),
  );
}

export function useSetContext(reference: SetReference) {
  const { programId, sessionId, activityId, setId } = reference;
  return useRead(
    useCallback(
      (db) =>
        getSetExecutionContext(db, { programId, sessionId, activityId, setId }),
      [programId, sessionId, activityId, setId],
    ),
  );
}

export function useExerciseSeries(reference: SetReference) {
  const { programId, sessionId, activityId, setId } = reference;
  return useRead(
    useCallback(
      (db) => {
        const facts = readExerciseSeriesFacts(db, {
          programId,
          sessionId,
          activityId,
          setId,
        });
        return facts ? buildExerciseSeriesProjection(facts, Date.now()) : null;
      },
      [programId, sessionId, activityId, setId],
    ),
  );
}

export function useEquipment() {
  return useRead(getEquipment);
}

export function useMuscleCatalog() {
  return useRead(listMuscleCatalog);
}

export function useExerciseCatalog() {
  return useRead(listSavedExercises);
}

/**
 * Saved exercises by ID, deleted ones included. Screens look exercises up here
 * as they render rather than copying them, so edits made elsewhere show.
 */
export function useExercisesById(): Record<string, SavedExercise> {
  const exercises = useExerciseCatalog();
  return useMemo(
    () => Object.fromEntries(exercises.map((item) => [item.id, item])),
    [exercises],
  );
}

export function useExercisePresets() {
  return useRead(listExercisePresets);
}

export function useExerciseLibrary() {
  return useRead(
    useCallback(
      (db) => ({
        saved: listSavedExercises(db),
        presets: listExercisePresets(db),
      }),
      [],
    ),
  );
}

export function useExerciseDetail(id: string | undefined) {
  return useRead(
    useCallback((db) => (id ? getSavedExercise(db, id) : null), [id]),
  );
}

export function useExerciseUsage(id: string | undefined) {
  return useRead(
    useCallback((db) => (id ? isExerciseUsed(db, id) : false), [id]),
  );
}
