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

export type Weight = {
  value: number
  unit: 'lbs' | 'kg'
}
