import AsyncStorage from '@react-native-async-storage/async-storage'
import create from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
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

console.log(mockPrograms)

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

export interface WorkoutStore {
  programs: Program[]
  exercises: Exercise[]
  addProgram: (program: Program) => void
  updateProgram: (program: Program) => void
  deleteProgram: (programId: string) => void
  addSession: (programId: string, session: Session) => void
  updateSession: (programId: string, session: Session) => void
  deleteSession: (programId: string, sessionId: string) => void
  addActivity: (programId: string, sessionId: string, activity: Activity) => void
  updateActivity: (programId: string, sessionId: string, activity: Activity) => void
  deleteActivity: (programId: string, sessionId: string, activityId: string) => void
  // reset: (programs: Program[], exercises: Exercise[]) => void
  addExercise: (exercise: Exercise) => void
  updateExercise: (exercise: Exercise) => void
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet
  ) => void
}

const useWorkoutStore = create<WorkoutStore>()(
  immer(
    persist(
      set => ({
        programs: mockPrograms,
        exercises: mockExercises,
        addProgram: (program: Program) => {
          set((state: WorkoutStore) => {
            state.programs.push(program)
          })
        },
        updateProgram: (program: Program) => {
          set((state: WorkoutStore) => {
            const current = state.programs.find(el => el.programId === program.programId)

            if (!current) {
              throw new Error('Program not found')
            }

            current.name = program.name
            current.sessions = program.sessions
          })
        },
        deleteProgram: (programId: string) => {
          set((state: WorkoutStore) => {
            const programIndex = state.programs.findIndex(el => el.programId === programId)
            state.programs.splice(programIndex, 1)
          })
        },
        // reset: (programs: Program[], exercises: Exercise[]) => {
        //   set(
        //     produce((state: WorkoutStore) => {
        //       state.programs = programs
        //       state.exercises = exercises
        //     })
        //   )
        // },
        addSession: (programId: string, session: Session) => {
          set((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)
            program?.sessions.push(session)
          })
        },
        updateSession: (programId: string, session: Session) => {
          set((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)
            const current = program?.sessions.find(el => el.sessionId === session.sessionId)

            if (!current) {
              throw new Error('Session not found')
            }

            current.name = session.name
            current.start = session.start
            current.end = session.end
            current.activities = session.activities
          })
        },
        deleteSession: (programId: string, sessionId: string) => {
          set((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)

            if (!program) {
              throw new Error('Program not found')
            }

            const sessionIndex = program.sessions.findIndex(el => el.sessionId === sessionId)
            program.sessions.splice(sessionIndex, 1)
          })
        },
        addActivity: (programId: string, sessionId: string, activity: Activity) => {
          set((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)

            if (!program) {
              throw new Error('Program not found')
            }

            const session = program.sessions.find(el => el.sessionId === sessionId)

            if (!session) {
              throw new Error('Session not found')
            }

            session.activities.push(activity)
          })
        },
        updateActivity: (programId: string, sessionId: string, activity: Activity) => {
          set((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)

            if (!program) {
              throw new Error('Program not found')
            }

            const session = program.sessions.find(el => el.sessionId === sessionId)

            if (!session) {
              throw new Error('Session not found')
            }

            const current = session.activities.find(el => el.activityId === activity.activityId)

            if (!current) {
              throw new Error('Activity not found')
            }

            current.warmupSets = activity.warmupSets
            current.workSets = activity.workSets
            current.load = activity.load
            current.exerciseId = activity.exerciseId
            current.rest = activity.rest
          })
        },
        deleteActivity: (programId: string, sessionId: string, activityId: string) => {
          set((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)

            if (!program) {
              throw new Error('Program not found')
            }

            const session = program.sessions.find(el => el.sessionId === sessionId)

            if (!session) {
              throw new Error('Session not found')
            }

            const activityIndex = session.activities.findIndex(el => el.activityId === activityId)
            session.activities.splice(activityIndex, 1)
          })
        },
        addExercise: (exercise: Exercise) => {
          set((state: WorkoutStore) => {
            state.exercises.push(exercise)
          })
        },
        updateExercise: (exercise: Exercise) => {
          set((state: WorkoutStore) => {
            const current = state.exercises.find(el => el.exerciseId === exercise.exerciseId)

            if (!current) {
              throw new Error('Exercise not found')
            }

            current.name = exercise.name
            current.muscle = exercise.muscle
            current.oneRepMax = exercise.oneRepMax
          })
        },
        updateWorkoutSet: (
          programId: string,
          sessionId: string,
          activityId: string,
          workoutSet: WorkoutSet
        ) => {
          set((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)

            if (!program) {
              throw new Error('Program not found')
            }

            const session = program.sessions.find(el => el.sessionId === sessionId)

            if (!session) {
              throw new Error('Session not found')
            }

            const activity = session.activities.find(el => el.activityId === activityId)

            if (!activity) {
              throw new Error('Activity not found')
            }

            const current =
              activity.workSets.find(el => el.workoutSetId === workoutSet.workoutSetId) ||
              activity.warmupSets.find(el => el.workoutSetId === workoutSet.workoutSetId)

            if (!current) {
              throw new Error('WorkoutSet not found')
            }

            current.actualReps = workoutSet.actualReps
            current.actualWeight = workoutSet.actualWeight
            current.end = workoutSet.end
            current.start = workoutSet.start
          })
        }
      }),
      {
        name: 'workout-storage',
        getStorage: () => AsyncStorage,
        // serialize: store => {
        //   const programs = store.state?.programs.map(program => ({
        //     ...program,
        //     sessions: program.sessions.map(session => ({
        //       ...session,
        //       activities: session.activities.map(activity => ({
        //         ...activity,
        //         warmupSets: activity.warmupSets.map(warmupSet => ({
        //           ...warmupSet,
        //           start: new Date(String(warmupSet.start))
        //         })),
        //         workSets: activity.workSets.map(workSet => ({
        //           ...workSet,
        //           start: new Date(String(workSet.start))
        //         }))
        //       }))
        //     }))
        //     // createdAt: (todo?.createdAt as Date)?.getTime(),
        //   }))
        //   return JSON.stringify(programs)
        // },
        deserialize: (serializedState: string) => {
          const programsWithParsedDates = JSON.parse(serializedState).programs.map(
            (program: Program) => ({
              ...program,
              sessions: program.sessions.map(session => ({
                ...session,
                activities: session.activities.map(activity => ({
                  ...activity,
                  warmupSets: activity.warmupSets.map(warmupSet => ({
                    ...warmupSet,
                    start: new Date(String(warmupSet.start))
                  })),
                  workSets: activity.workSets.map(workSet => ({
                    ...workSet,
                    start: new Date(String(workSet.start))
                  }))
                }))
              }))
            })
          )

          return {
            state: {
              programsWithParsedDates
            }
          }
        }
        // serialize: state => JSON.stringify(state),
        // deserialize: str => {
        //   const parsed = JSON.parse(str)

        //   let { programs }: WorkoutStore = parsed

        //   const newPrograms = programs.map(program =>
        //     program.sessions.map(session =>
        //       session.activities.map(activity => {
        //         activity.warmupSets.map(workoutSet => {
        //           const dateParsed: WorkoutSet = {
        //             ...workoutSet,
        //             start: new Date(String(workoutSet.start)),
        //             end: new Date(String(workoutSet.end))
        //           }
        //           return dateParsed
        //         })
        //         activity.workSets.map(workoutSet => {
        //           workoutSet.start = new Date(workoutSet.start)
        //           workoutSet.end = new Date(workoutSet.end)
        //           return workoutSet
        //         })
        //         return activity
        //       })
        //     )
        //   )

        //   programs = newPrograms

        //   return parsed
        // }
      }
    )
  )
)

export default useWorkoutStore
