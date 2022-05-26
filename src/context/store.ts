import create from 'zustand'
import { Activity, Exercise, Program, Session, WorkoutSet } from '../types'

const mockPrograms: Program[] = [
  {
    name: 'Strength',
    sessions: [
      {
        name: 'Chest',
        sessionId: '1',
        start: new Date('2022-04-01T00:00:00.000Z'),
        end: undefined,
        activities: [
          {
            activityId: '1',
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exerciseId: '1',
            warmupSets: [
              {
                workoutSetId: '1',
                type: 'Warm-up'
              },
              {
                workoutSetId: '2',
                type: 'Warm-up'
              },
              {
                workoutSetId: '3',
                type: 'Warm-up'
              }
            ],
            workSets: [
              {
                workoutSetId: '4',
                type: 'Work'
              },
              {
                workoutSetId: '5',
                type: 'Work'
              },
              {
                workoutSetId: '6',
                type: 'Work'
              }
            ]
          }
        ]
      },

      {
        name: 'Chest',
        sessionId: '2',
        start: new Date('2022-04-10T00:00:00.000Z'),
        end: undefined,
        activities: [
          {
            activityId: '2',
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exerciseId: '1',
            warmupSets: [
              {
                workoutSetId: '1',
                type: 'Warm-up'
              },
              {
                workoutSetId: '2',
                type: 'Warm-up'
              },
              {
                workoutSetId: '3',
                type: 'Warm-up'
              }
            ],
            workSets: [
              {
                workoutSetId: '4',
                type: 'Work'
              },
              {
                workoutSetId: '5',
                type: 'Work'
              },
              {
                workoutSetId: '6',
                type: 'Work'
              }
            ]
          }
        ]
      },
      {
        name: 'Chest',
        sessionId: '3',
        start: new Date('2022-04-11T00:00:00.000Z'),
        end: undefined,
        activities: [
          {
            activityId: '3',
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exerciseId: '1',
            warmupSets: [
              {
                workoutSetId: '1',
                type: 'Warm-up'
              },
              {
                workoutSetId: '2',
                type: 'Warm-up'
              },
              {
                workoutSetId: '3',
                type: 'Warm-up'
              }
            ],
            workSets: [
              {
                workoutSetId: '4',
                type: 'Work'
              },
              {
                workoutSetId: '5',
                type: 'Work'
              },
              {
                workoutSetId: '6',
                type: 'Work'
              }
            ]
          }
        ]
      },

      {
        name: 'Chest',
        sessionId: '4',
        start: new Date('2022-04-16T00:00:00.000Z'),
        end: undefined,
        activities: [
          {
            activityId: '4',
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exerciseId: '1',
            warmupSets: [
              {
                workoutSetId: '1',
                type: 'Warm-up'
              },
              {
                workoutSetId: '2',
                type: 'Warm-up'
              },
              {
                workoutSetId: '3',
                type: 'Warm-up'
              }
            ],
            workSets: [
              {
                workoutSetId: '4',
                type: 'Work'
              },
              {
                workoutSetId: '5',
                type: 'Work'
              },
              {
                workoutSetId: '6',
                type: 'Work'
              }
            ]
          }
        ]
      }
    ],
    programId: '1'
  }
]
const mockExercises: Exercise[] = [
  {
    exerciseId: '1',
    name: 'Squat',
    muscle: 'Quadriceps',
    oneRepMax: {
      value: 106,
      unit: 'lbs'
    }
  }
]

interface WorkoutStateStorage {
  programs: Program[]
  exercises: Exercise[]
  addProgram: (program: Program) => void
  deleteProgram: (programId: string) => void
  updateProgram: (program: Program) => void
  addSession: (programId: string, session: Session) => void
  updateSession: (programId: string, session: Session) => void
  deleteSession: (programId: string, sessionId: string) => void
  addActivity: (programId: string, sessionId: string, activity: Activity) => void
  updateActivity: (programId: string, sessionId: string, activity: Activity) => void
  deleteActivity: (programId: string, sessionId: string, activityId: string) => void
  reset: (programs: Program[], exercises: Exercise[]) => void
  addExercise: (exercise: Exercise) => void
  updateExercise: (exercise: Exercise) => void
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet
  ) => void
}

const useWorkoutStore = create<WorkoutStateStorage>(set => ({
  //   bears: 0,
  //   increasePopulation: () => set(state => ({ programs: state.programs + 1 })),
  //   removeAllBears: () => set({ bears: 0 })
  programs: mockPrograms,
  exercises: mockExercises,
  addProgram: () => 0,
  deleteProgram: () => 0,
  updateProgram: () => 0,
  addSession: () => 0,
  updateSession: () => 0,
  deleteSession: () => 0,
  addActivity: () => 0,
  updateActivity: () => 0,
  deleteActivity: () => 0,
  reset: () => 0,
  addExercise: () => 0,
  updateExercise: () => 0,
  updateWorkoutSet: () => 0
}))

export default useWorkoutStore
