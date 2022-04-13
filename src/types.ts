export type BaseEntity = {
  entityId: string
  name: string
}

export type StackParamList = {
  DashboardScreen: undefined
  ProgramDetailScreen: BaseEntity
  ProgramFormModal: undefined
  SessionDetailScreen: BaseEntity
  SessionFormModal: undefined
  ActivityDetailScreen: BaseEntity
  ActivityFormModal: undefined
}

export type Activity = {
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
  muscle: string
  oneRepMax: Weight
} & BaseEntity

export type Weight = {
  value: number
  unit: 'lbs'
}

export type Session = {
  start: Date
  end: Date | undefined
  activities: Activity[]
} & BaseEntity

export type Program = {
  icon?: string
  type: 'Workout Program'
  sessions: Session[]
} & BaseEntity
