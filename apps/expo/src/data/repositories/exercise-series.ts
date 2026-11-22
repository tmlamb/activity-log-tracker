import type { Db } from "../database/db";
import type { SetKind } from "./session-detail";
import type { SetReference } from "./sets";
import { kindRankSql } from "./sets";

export interface SeriesSelection {
  sessionName: string;
  exerciseName: string;
  exerciseId: string;
  lineageId: string;
  occurrence: number;
  maxValue: number | null;
  maxUnit: "lbs" | "kg" | null;
  /** The selected activity (or the one it is an alternative of) is in a superset. */
  superset: boolean;
  /** The referenced activity is an alternative, so it isn't to be performed. */
  alternative: boolean;
}
export interface SeriesSession {
  id: string;
  status: "Planned" | "Ready" | "Done" | "Incomplete";
  startMs: number | null;
  endMs: number | null;
}
export interface SeriesSetFact {
  sessionId: string;
  activityId: string;
  plannedReps: number | null;
  loadType: "PERCENT" | "RPE" | null;
  loadValue: number | null;
  dropPercent: number | null;
  id: string;
  kind: SetKind;
  status: "Planned" | "Ready" | "Done" | "Incomplete";
  feedback: "Easy" | "Neutral" | "Hard";
  actualReps: number | null;
  weightValue: number | null;
  weightUnit: "lbs" | "kg" | null;
  startMs: number | null;
  endMs: number | null;
}
/**
 * A completed set of another exercise in the same activity: an alternative the
 * exercise was swapped out for.
 */
export interface SeriesAlternativeSetFact extends SeriesSetFact {
  alternativeName: string | null;
  /** The set's number among its row's sets of its kind, from 0. */
  position: number;
}
/** An alternative of the selected activity, with the set to open it at. */
export interface SeriesAlternative {
  activityId: string;
  exerciseName: string;
  setId: string;
}
export interface ExerciseSeriesFacts {
  reference: SetReference;
  selection: SeriesSelection;
  sessions: SeriesSession[];
  sets: SeriesSetFact[];
  /** By session, the selected exercise's before other alternatives'. */
  alternativeSets: SeriesAlternativeSetFact[];
  alternatives: SeriesAlternative[];
}

/** SQL for whether `activity` is a main one or was at least partly performed. */
function countedSql(activity: string) {
  return `(${activity}.parent_activity_id IS NULL OR EXISTS(
    SELECT 1 FROM workout_sets done WHERE done.program_id = ${activity}.program_id
      AND done.session_id = ${activity}.session_id AND done.activity_id = ${activity}.id
      AND done.status = 'Done'))`;
}

/**
 * Read a single exercise occurrence per lineage session in one read snapshot.
 * The reference may be an alternative: its history is the sessions where its
 * exercise was performed in its main activity's place. Sets completed before
 * their exercise was swapped out are history too, so occurrences count main
 * activities and alternatives with completed sets. Alternatives without any
 * come after those: they tell which activity the exercise was swapped out of.
 */
export function readExerciseSeriesFacts(
  reader: Db,
  reference: SetReference,
): ExerciseSeriesFacts | null {
  const { programId, sessionId, activityId, setId } = reference;
  const selected = reader.getFirstSync<
    Omit<SeriesSelection, "superset" | "alternative"> & {
      superset: number;
      alternative: number;
    }
  >(
    `SELECT s.name AS sessionName, e.name AS exerciseName, e.id AS exerciseId,
       s.lineage_id AS lineageId, e.one_rep_max_value AS maxValue, e.one_rep_max_unit AS maxUnit,
       (SELECT COUNT(*) FROM activities previous
         LEFT JOIN activities previous_parent ON previous_parent.program_id = previous.program_id
           AND previous_parent.session_id = previous.session_id AND previous_parent.id = previous.parent_activity_id
         WHERE previous.program_id = a.program_id
           AND previous.session_id = a.session_id AND previous.exercise_id = a.exercise_id
           AND ${countedSql("previous")}
           AND COALESCE(previous_parent.position, previous.position) < COALESCE(parent.position, a.position)) AS occurrence,
       a.parent_activity_id IS NOT NULL AS alternative,
       (COALESCE(parent.superset_activity_id, a.superset_activity_id) IS NOT NULL
         OR EXISTS(SELECT 1 FROM activities member WHERE member.program_id = a.program_id
           AND member.session_id = a.session_id
           AND member.superset_activity_id = COALESCE(parent.id, a.id))) AS superset
     FROM activities a JOIN sessions s ON s.program_id = a.program_id AND s.id = a.session_id
     LEFT JOIN activities parent ON parent.program_id = a.program_id
       AND parent.session_id = a.session_id AND parent.id = a.parent_activity_id
     JOIN exercises e ON e.id = a.exercise_id
     JOIN workout_sets w ON w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id
     WHERE a.program_id = ? AND a.session_id = ? AND a.id = ? AND w.id = ? AND s.lineage_id IS NOT NULL`,
    programId,
    sessionId,
    activityId,
    setId,
  );
  if (!selected) return null;
  const selection: SeriesSelection = {
    ...selected,
    superset: selected.superset === 1,
    alternative: selected.alternative === 1,
  };
  const sessions = reader.getAllSync<SeriesSession>(
    `SELECT id, status, start_ms AS startMs, end_ms AS endMs FROM sessions
     WHERE program_id = ? AND lineage_id = ? ORDER BY position`,
    programId,
    selection.lineageId,
  );
  // Other sessions match the exercise's occurrence; the current session is
  // always the referenced activity, main or alternative.
  const rows = reader.getAllSync<
    SeriesAlternativeSetFact & { alternative: number }
  >(
    `WITH occurrences AS (
       SELECT a.program_id, a.session_id, a.id, COALESCE(a.parent_activity_id, a.id) AS main_id,
         ROW_NUMBER() OVER (PARTITION BY a.session_id
           ORDER BY ${countedSql("a")} DESC, COALESCE(parent.position, a.position), a.parent_activity_id IS NOT NULL, a.position) - 1 AS occurrence
       FROM sessions s JOIN activities a ON a.program_id = s.program_id AND a.session_id = s.id
       LEFT JOIN activities parent ON parent.program_id = a.program_id
         AND parent.session_id = a.session_id AND parent.id = a.parent_activity_id
       WHERE s.program_id = ? AND s.lineage_id = ? AND a.exercise_id = ?
         AND s.id <> ?
       UNION ALL
       SELECT program_id, session_id, id, COALESCE(parent_activity_id, id), ? AS occurrence
       FROM activities WHERE program_id = ? AND session_id = ? AND id = ?
     )
     SELECT s.id AS sessionId, r.id AS activityId, r.reps AS plannedReps, r.id <> a.id AS alternative,
       e.name AS alternativeName, w.position,
       r.load_type AS loadType, r.load_value AS loadValue, r.drop_percent AS dropPercent, w.id, w.kind, w.status, w.feedback,
       w.actual_reps AS actualReps, w.weight_value AS weightValue, w.weight_unit AS weightUnit,
       w.start_ms AS startMs, w.end_ms AS endMs
     FROM sessions s JOIN occurrences a ON a.program_id = s.program_id AND a.session_id = s.id AND a.occurrence = ?
     JOIN activities r ON r.program_id = a.program_id AND r.session_id = a.session_id
       AND (r.id = a.id OR ((r.id = a.main_id OR r.parent_activity_id = a.main_id) AND r.exercise_id IS NOT ?))
     JOIN workout_sets w ON w.program_id = r.program_id AND w.session_id = r.session_id AND w.activity_id = r.id
       AND (r.id = a.id OR (w.status = 'Done' AND w.actual_reps > 0))
     LEFT JOIN exercises e ON e.id = r.exercise_id
     WHERE s.program_id = ? AND s.lineage_id = ?
     ORDER BY s.position, r.parent_activity_id IS NOT NULL, r.position, w.kind, w.position`,
    programId,
    selection.lineageId,
    selection.exerciseId,
    sessionId,
    selection.occurrence,
    programId,
    sessionId,
    activityId,
    selection.occurrence,
    selection.exerciseId,
    programId,
    selection.lineageId,
  );
  const sets: SeriesSetFact[] = [];
  const alternativeSets: SeriesAlternativeSetFact[] = [];
  for (const { alternative, ...item } of rows) {
    if (alternative === 1) {
      alternativeSets.push(item);
      continue;
    }
    const { alternativeName: _name, position: _position, ...set } = item;
    sets.push(set);
  }
  // Open each alternative at the set matching the selected one, or else at its
  // first main set, or else its first set.
  const alternatives = reader.getAllSync<
    Omit<SeriesAlternative, "setId"> & { setId: string | null }
  >(
    `WITH selected AS (
       SELECT kind, position FROM workout_sets
       WHERE program_id = ? AND session_id = ? AND activity_id = ? AND id = ?
     )
     SELECT a.id AS activityId, e.name AS exerciseName,
       (SELECT w.id FROM workout_sets w
        WHERE w.program_id = a.program_id AND w.session_id = a.session_id AND w.activity_id = a.id
        ORDER BY (w.kind = (SELECT kind FROM selected) AND w.position = (SELECT position FROM selected)) DESC,
          w.kind = 'Main' DESC, ${kindRankSql("w.kind")}, w.position
        LIMIT 1) AS setId
     FROM activities a JOIN exercises e ON e.id = a.exercise_id
     WHERE a.program_id = ? AND a.session_id = ? AND a.parent_activity_id = ?
     ORDER BY a.position`,
    programId,
    sessionId,
    activityId,
    setId,
    programId,
    sessionId,
    activityId,
  );
  return {
    reference: { ...reference },
    selection,
    sessions,
    sets,
    alternativeSets,
    // An alternative without sets has nothing to show.
    alternatives: alternatives.flatMap(
      ({ setId: alternativeSetId, ...item }) =>
        alternativeSetId === null ? [] : [{ ...item, setId: alternativeSetId }],
    ),
  };
}
