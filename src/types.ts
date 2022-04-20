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
  newLoad?: {
    load: Load
    activityId: string
  }
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

export type LoadFormNavParams = {
  load?: Load
  onSelect: (load: Load) => void
}

export type ExerciseSelectNavParams = {
  exercise?: Exercise
  onSelect: (exercise: Exercise) => void
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
}

export type Activity = {
  activityId: string
  warmupSets?: number
  workSets: number
  reps: number
  load: Load
  rest: number
  exercise: Exercise
}

export type Load = {
  value: number
  type: 'PERCENT' | 'RPE'
}

export type Exercise = {
  name: string
  exerciseId: string
  muscle: string
  oneRepMax: Weight
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
