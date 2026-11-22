import type { SessionEditorExercise } from "~/data/repositories/session-editor";

/** How an exercise row names its exercise. */
export function exerciseLabel(
  exercise: SessionEditorExercise | undefined,
  exerciseId: string | null,
) {
  return exercise
    ? `${exercise.name}${exercise.deleted ? " (Deleted)" : ""}`
    : exerciseId
      ? "Unavailable exercise"
      : "Select Exercise";
}
