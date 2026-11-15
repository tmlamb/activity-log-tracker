import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { ApplicationMemory } from "../application-memory";
import type { WorkoutChange } from "./invalidation";
import {
  getMemoryExercise,
  getMemoryProgramOverview,
  getMemoryPrograms,
  getMemoryProgramWeek,
  getMemorySessionEditorSeed,
  getMemorySetContext,
  getMemoryTemplateChoices,
} from "../application-memory";
import { affectedQueryKeys } from "./invalidation";
import { workoutKeys } from "./keys";

function matches(key: QueryKey, prefix: QueryKey) {
  return prefix.every((part, index) => key[index] === part);
}

/** Refresh already-mounted screen projections from committed memory before invalidation. */
export function publishMemoryToCache(
  cache: QueryClient,
  memory: ApplicationMemory,
  change: WorkoutChange,
  nowMs: number,
) {
  const prefixes = affectedQueryKeys(change);
  const queries = cache
    .getQueryCache()
    .findAll({ queryKey: workoutKeys.root(memory.generation) });
  for (const query of queries) {
    const key = query.queryKey;
    if (
      query.state.data === undefined ||
      !prefixes.some((prefix) => matches(key, prefix))
    )
      continue;
    let data: unknown;
    if (key[2] === "programs") data = getMemoryPrograms(memory);
    else if (key[2] === "equipment")
      data = {
        barbells: memory.data.equipment.barbells.map(({ id, ...item }) => ({
          ...item,
          barbellId: id,
        })),
        plates: memory.data.equipment.plates.map(({ id, ...item }) => ({
          ...item,
          plateId: id,
        })),
      };
    else if (key[2] === "muscles") data = [...memory.data.muscleGroups];
    else if (key[2] === "exercise-catalog") {
      const saved = memory.data.exercises
        .map(({ id }) => getMemoryExercise(memory, id))
        .filter((exercise) => exercise !== null);
      data =
        key[3] === "library" ? { saved, presets: memory.data.presets } : saved;
    } else if (
      key[2] === "exercise" &&
      typeof key[3] === "string" &&
      key[4] === "detail"
    )
      data = getMemoryExercise(memory, key[3]);
    else if (
      key[2] === "exercise" &&
      typeof key[3] === "string" &&
      key[4] === "usage"
    )
      data = [...memory.activities.values()].some(
        (activity) => activity.exerciseId === key[3],
      );
    else if (key[2] === "program" && typeof key[3] === "string") {
      const programId = key[3];
      if (key[4] === "header") {
        const program = memory.programs.get(programId);
        data = program ? { id: program.id, name: program.name } : null;
      } else if (key[4] === "timeline" && key[5] === "overview")
        data = getMemoryProgramOverview(memory, programId, nowMs);
      else if (
        key[4] === "timeline" &&
        key[5] === "week" &&
        typeof key[6] === "number" &&
        typeof key[7] === "number" &&
        typeof key[8] === "number"
      ) {
        const page = getMemoryProgramWeek(
          memory,
          programId,
          key[6],
          key[7],
          key[8],
          nowMs,
        );
        if (page) data = { pages: [page], pageParams: [undefined] };
      } else if (
        key[4] === "session-editor" &&
        (typeof key[5] === "string" || key[5] === null)
      )
        data = getMemorySessionEditorSeed(memory, programId, key[5]);
      else if (key[4] === "templates")
        data = getMemoryTemplateChoices(memory, programId);
      else if (key[4] === "session" && typeof key[5] === "string") {
        if (key[6] === "detail")
          data =
            getMemorySessionEditorSeed(memory, programId, key[5])?.session ??
            null;
        else if (
          key[6] === "set" &&
          typeof key[7] === "string" &&
          typeof key[8] === "string"
        )
          data = getMemorySetContext(memory, {
            programId,
            sessionId: key[5],
            activityId: key[7],
            setId: key[8],
          });
      }
    }
    if (data !== undefined) cache.setQueryData(key, data);
  }
}
