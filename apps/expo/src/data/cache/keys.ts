/** Generation changes only when the entire dataset is replaced or reset. */
export const workoutKeys = {
  root: (generation: number) => ["workout", generation] as const,
  programs: (generation: number) =>
    [...workoutKeys.root(generation), "programs"] as const,
  equipment: (generation: number) =>
    [...workoutKeys.root(generation), "equipment"] as const,
  muscles: (generation: number) =>
    [...workoutKeys.root(generation), "muscles"] as const,
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
  templates: (generation: number, programId: string) =>
    [...workoutKeys.program(generation, programId), "templates"] as const,
  sessions: (generation: number, programId: string) =>
    [...workoutKeys.program(generation, programId), "session"] as const,
  session: (generation: number, programId: string, sessionId: string) =>
    [...workoutKeys.sessions(generation, programId), sessionId] as const,
  sessionDetail: (generation: number, programId: string, sessionId: string) =>
    [
      ...workoutKeys.session(generation, programId, sessionId),
      "detail",
    ] as const,
  setContexts: (generation: number, programId: string, sessionId: string) =>
    [...workoutKeys.session(generation, programId, sessionId), "set"] as const,
  exercise: (generation: number, exerciseId: string) =>
    [...workoutKeys.root(generation), "exercise", exerciseId] as const,
  exerciseCatalog: (generation: number) =>
    [...workoutKeys.root(generation), "exercise-catalog"] as const,
  exerciseUsage: (generation: number, exerciseId: string) =>
    [...workoutKeys.exercise(generation, exerciseId), "usage"] as const,
  exerciseDetail: (generation: number, exerciseId: string) =>
    [...workoutKeys.exercise(generation, exerciseId), "detail"] as const,
  exerciseNotes: (generation: number, exerciseId: string) =>
    [...workoutKeys.exercise(generation, exerciseId), "notes"] as const,
};
