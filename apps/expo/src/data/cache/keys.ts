/** Generation changes only when the entire dataset is replaced or reset. */
export const workoutKeys = {
  root: (generation: number) => ["workout", generation] as const,
  programs: (generation: number) =>
    [...workoutKeys.root(generation), "programs"] as const,
  program: (generation: number, programId: string) =>
    [...workoutKeys.root(generation), "program", programId] as const,
  programHeader: (generation: number, programId: string) =>
    [...workoutKeys.program(generation, programId), "header"] as const,
  timeline: (generation: number, programId: string) =>
    [...workoutKeys.program(generation, programId), "timeline"] as const,
  programInsights: (generation: number, programId: string) =>
    [...workoutKeys.program(generation, programId), "insights"] as const,
  exerciseSeries: (generation: number, programId: string) =>
    [...workoutKeys.program(generation, programId), "exercise-series"] as const,
  session: (generation: number, programId: string, sessionId: string) =>
    [
      ...workoutKeys.program(generation, programId),
      "session",
      sessionId,
    ] as const,
  sessionDetail: (generation: number, programId: string, sessionId: string) =>
    [
      ...workoutKeys.session(generation, programId, sessionId),
      "detail",
    ] as const,
  setContexts: (generation: number, programId: string, sessionId: string) =>
    [...workoutKeys.session(generation, programId, sessionId), "set"] as const,
  exercise: (generation: number, exerciseId: string) =>
    [...workoutKeys.root(generation), "exercise", exerciseId] as const,
  exerciseNotes: (generation: number, exerciseId: string) =>
    [...workoutKeys.exercise(generation, exerciseId), "notes"] as const,
};
