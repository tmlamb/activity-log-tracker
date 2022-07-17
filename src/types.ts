export type ProgramNavParams = {
  programId: string
}

export type ProgramFormNavParams = {
  programId?: string
}

export type SessionNavParams = {
  sessionId: string
  programId: string
}

export type SessionFormNavParams = {
  sessionId?: string
  programId: string
}

export type ActivityNavParams = {
  activityId: string
  sessionId: string
  programId: string
}

export type ActivityFormNavParams = {
  activityId?: string
  sessionId: string
  programId: string
}

export type LoadFormNavParams = ModalSelectParams<Load> & {
  exerciseId?: string
}

export type ExerciseSelectNavParams = ModalSelectParams<Exercise>

export type ModalSelectParams<T> = {
  // [x: string]: any
  value?: T
  onChangeSelectKey: string
}

// export type ModalSelectEntity = Exercise | Load

export type ExerciseFormNavParams = {
  exerciseId?: string
  name?: string
}

export type WorkoutSetNavParams = {
  title: string
  workoutSetId: string
  activityId: string
  sessionId: string
  programId: string
}

export type StackParamList = {
  DashboardScreen: undefined
  SettingsScreen: undefined
  ExerciseSettingsScreen: undefined
  ProgramDetailScreen: ProgramNavParams
  ProgramFormModal: ProgramFormNavParams
  SessionDetailScreen: SessionNavParams
  SessionFormModal: SessionFormNavParams
  ActivityDetailScreen: ActivityNavParams
  ActivityFormModal: ActivityFormNavParams
  LoadFormModal: LoadFormNavParams
  ExerciseSelectModal: ExerciseSelectNavParams
  ExerciseFormModal: ExerciseFormNavParams
  WorkoutSetDetailScreen: WorkoutSetNavParams
}

export type WorkoutSet = {
  workoutSetId: string
  start?: Date
  end?: Date
  status: 'Planned' | 'Ready' | 'Done'
  type: 'Warmup' | 'Main'
  actualWeight?: Weight
  actualReps?: number
  feedback: 'Easy' | 'Neutral' | 'Hard'
}

export type WarmupSet = WorkoutSet & {
  type: 'Warmup'
}
export type MainSet = WorkoutSet & {
  type: 'Main'
}

export type Activity = {
  activityId: string
  reps: number
  load: Load
  rest: number
  exerciseId: string
  warmupSets: WarmupSet[]
  mainSets: MainSet[]
}

export type Load = {
  value: number
  type: 'PERCENT' | 'RPE'
}

export type Exercise = {
  name: string
  exerciseId: string
  oneRepMax: Weight
  primaryMuscle?: string
}

export type Weight = {
  value: number
  unit: 'lbs' | 'kg'
}

export type Session = {
  name: string
  sessionId: string
  start?: Date
  end?: Date
  status: 'Planned' | 'Ready' | 'Done'
  activities: Activity[]
}

export type Program = {
  name: string
  programId: string
  sessions: Session[]
}

export type Equipment = {
  barbellWeight: Weight
  platePairs: Weight[]
}
