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

export type LoadFormNavParams = ModalSelectParams<Load>

export type ExerciseSelectNavParams = ModalSelectParams<string>

export type ModalSelectParams<T> = {
  value?: T
  onChangeSelect: (value: T) => void
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
  ProgramDetailScreen: ProgramNavParams
  ProgramFormModal: ProgramFormNavParams
  SessionDetailScreen: SessionNavParams
  SessionFormModal: SessionFormNavParams
  ActivityDetailScreen: ActivityNavParams
  ActivityFormModal: ActivityFormNavParams
  LoadFormModal: LoadFormNavParams
  ExerciseSelectModal: ExerciseSelectNavParams
  WorkoutSetDetailScreen: WorkoutSetNavParams
}

export type WorkoutSet = {
  workoutSetId: string
  type: 'Warm-up' | 'Work'
  start?: Date
  end?: Date
}

export type Activity = {
  activityId: string
  warmupSets?: number // planned
  workSets: number // sets
  reps: number
  load: Load
  rest: number
  exerciseId: string
  workoutSets: WorkoutSet[] // recording of actual sets
}

export type Load = {
  value: number
  type: 'PERCENT' | 'RPE'
}

export type Exercise = {
  name: string
  exerciseId: string
  muscle: string
  oneRepMax?: Weight
}

export type Weight = {
  value: number
  unit: 'lbs'
}

export type Session = {
  name: string
  sessionId: string
  start: Date
  end?: Date
  activities: Activity[]
}

export type Program = {
  name: string
  programId: string
  sessions: Session[]
}
