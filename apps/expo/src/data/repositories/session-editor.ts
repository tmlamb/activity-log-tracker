import type { SessionDetail } from "./session-detail";
import type { SessionPolicy } from "./session-policy";
import { getProgramHeader } from "./program-timeline";
import { getSessionDetail } from "./session-detail";
import { getSessionPolicy } from "./session-policy";

interface EditorReader {
  getFirstAsync<T>(sql: string, ...parameters: string[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...parameters: string[]): Promise<T[]>;
}

export interface SessionEditorExercise {
  id: string;
  name: string;
  deleted: boolean;
  loadKind: "BARBELL" | "WEIGHT_PAIR" | "SINGLE_WEIGHT" | null;
  oneRepMax: { value: number; unit: "lbs" | "kg" } | null;
}

export interface SessionEditorSeed {
  generation: number;
  program: { id: string; name: string };
  session: SessionDetail | null;
  policy: SessionPolicy | null;
  exercises: SessionEditorExercise[];
}

/** Read a complete seed in the caller's snapshot; no unrelated history graphs. */
export async function getSessionEditorSeed(
  reader: EditorReader,
  generation: number,
  programId: string,
  sessionId: string | null,
): Promise<SessionEditorSeed | null> {
  const program = await getProgramHeader(reader, programId);
  if (!program) return null;
  if (sessionId === null)
    return { generation, program, session: null, policy: null, exercises: [] };
  const session = await getSessionDetail(reader, programId, sessionId);
  if (!session) return null;
  const policy = await getSessionPolicy(reader, programId, sessionId);
  if (!policy) throw new Error("The session policy could not be loaded.");
  const rows = await reader.getAllAsync<{
    id: string;
    name: string;
    deleted: number;
    loadKind: SessionEditorExercise["loadKind"];
    maxValue: number | null;
    maxUnit: "lbs" | "kg" | null;
  }>(
    `SELECT DISTINCT e.id, e.name, e.deleted, e.load_kind AS loadKind,
       e.one_rep_max_value AS maxValue, e.one_rep_max_unit AS maxUnit, e.position
     FROM activities a JOIN exercises e ON e.id = a.exercise_id
     WHERE a.program_id = ? AND a.session_id = ? ORDER BY e.position`,
    programId,
    sessionId,
  );
  return {
    generation,
    program,
    session,
    policy,
    exercises: rows.map(
      ({ id, name, deleted, loadKind, maxValue, maxUnit }) => ({
        id,
        name,
        deleted: deleted === 1,
        loadKind,
        oneRepMax:
          maxValue !== null && maxUnit !== null
            ? { value: maxValue, unit: maxUnit }
            : null,
      }),
    ),
  };
}
