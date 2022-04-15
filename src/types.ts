export type BaseEntity = {
  name: string
}

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

export type StackParamList = {
  DashboardScreen: undefined
  ProgramDetailScreen: ProgramNavParams
  ProgramFormModal: ProgramFormNavParams
  SessionDetailScreen: SessionNavParams
  SessionFormModal: SessionFormNavParams
  ActivityDetailScreen: ActivityNavParams
  ActivityFormModal: ActivityFormNavParams
}

export type Activity = {
  activityId: string
  warmupSets: number
  workSets: number
  reps: number
  load: Load
  rest: number
  exercise: Exercise
} & BaseEntity

export type Load = {
  value: number
  type: 'PERCENT' | 'RPE'
}

export type Exercise = {
  exerciseId: string
  muscle: string
  oneRepMax: Weight
} & BaseEntity

export type Weight = {
  value: number
  unit: 'lbs'
}

export type Session = {
  sessionId: string
  start: Date
  end: Date | undefined
  activities: Activity[]
} & BaseEntity

export type Program = {
  programId: string
  icon?: string
  sessions: Session[]
} & BaseEntity
