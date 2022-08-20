import AsyncStorage from '@react-native-async-storage/async-storage'
import produce from 'immer'
import create from 'zustand'
import { persist } from 'zustand/middleware'
import { Activity, Equipment, Exercise, Program, Session, WorkoutSet } from '../types'
import { dateRegex } from '../utils'

export interface WorkoutStore {
  programs: Program[]
  exercises: Exercise[]
  equipment: Equipment
  hasHydrated: boolean
  setHasHydrated: (hasHydrated: boolean) => void
  addProgram: (program: Program) => void
  updateProgram: (program: Program) => void
  deleteProgram: (programId: string) => void
  addSession: (programId: string, session: Session) => void
  updateSession: (programId: string, session: Session) => void
  startSession: (programId: string, sessionId: string) => void
  deleteSession: (programId: string, sessionId: string) => void
  addActivity: (programId: string, sessionId: string, activity: Activity) => void
  updateActivity: (programId: string, sessionId: string, activity: Activity) => void
  deleteActivity: (programId: string, sessionId: string, activityId: string) => void
  addExercise: (exercise: Exercise) => void
  updateExercise: (exercise: Exercise) => void
  deleteExercise: (exerciseId: string) => void
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet
  ) => void
  updateEquipment: (equipment: Equipment) => void
}

const useWorkoutStore = create<WorkoutStore>()(
  persist(
    set => ({
      programs: [],
      exercises: [],
      equipment: {
        barbellWeight: { value: 45, unit: 'lbs' },
        platePairs: [
          { value: 2.5, unit: 'lbs', platePairId: '1' },
          { value: 5, unit: 'lbs', platePairId: '2' },
          { value: 10, unit: 'lbs', platePairId: '3' },
          { value: 10, unit: 'lbs', platePairId: '4' },
          { value: 25, unit: 'lbs', platePairId: '5' },
          { value: 45, unit: 'lbs', platePairId: '6' },
          { value: 45, unit: 'lbs', platePairId: '7' },
          { value: 45, unit: 'lbs', platePairId: '8' },
          { value: 45, unit: 'lbs', platePairId: '9' }
        ]
      },
      hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated })
      },
      addProgram: (program: Program) => {
        set(
          produce((state: WorkoutStore) => {
            state.programs.push(program)
          })
        )
      },
      updateProgram: (program: Program) => {
        set(
          produce((state: WorkoutStore) => {
            const current = state.programs.find(el => el.programId === program.programId)

            if (!current) {
              throw new Error('Program not found')
            }

            current.name = program.name.trim()
            current.sessions = program.sessions
          })
        )
      },
      deleteProgram: (programId: string) => {
        set(
          produce((state: WorkoutStore) => {
            const programIndex = state.programs.findIndex(el => el.programId === programId)
            state.programs.splice(programIndex, 1)
          })
        )
      },
      addSession: (programId: string, session: Session) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)
            program?.sessions.push(session)
          })
        )
      },
      updateSession: (programId: string, session: Session) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)
            const current = program?.sessions.find(el => el.sessionId === session.sessionId)

            if (!current) {
              throw new Error('Session not found')
            }

            current.name = session.name.trim()
            current.start = session.start
            current.end = session.end
            current.activities = session.activities
            current.status = session.status
          })
        )
      },
      startSession: (programId: string, sessionId: string) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)

            if (!program) {
              throw new Error('Program not found')
            }

            const session = program.sessions.find(el => el.sessionId === sessionId)

            if (!session) {
              throw new Error('Session not found')
            }

            if (session.status !== 'Planned') {
              throw new Error(`Session already started: ${session}`)
            }

            session.start = new Date()
            session.status = 'Ready'
          })
        )
      },
      deleteSession: (programId: string, sessionId: string) => {
        set(
          produce((state: WorkoutStore) => {
            const program = state.programs.find(el => el.programId === programId)

            if (!program) {
              throw new Error('Program not found')
            }

            const sessionIndex = program.sessions.findIndex(el => el.sessionId === sessionId)
            program.sessions.splice(sessionIndex, 1)
          })
        )
      },
      addActivity: (programId: string, sessionId: string, activity: Activity) => {
        set(
          produce((state: WorkoutStore) => {
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
        )
      },
      updateActivity: (programId: string, sessionId: string, activity: Activity) => {
        set(
          produce((state: WorkoutStore) => {
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
            current.mainSets = activity.mainSets
            current.load = activity.load
            current.exerciseId = activity.exerciseId
            current.rest = activity.rest
          })
        )
      },
      deleteActivity: (programId: string, sessionId: string, activityId: string) => {
        set(
          produce((state: WorkoutStore) => {
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
        )
      },
      addExercise: (exercise: Exercise) => {
        set(
          produce((state: WorkoutStore) => {
            state.exercises.push(exercise)
          })
        )
      },
      updateExercise: (exercise: Exercise) => {
        set(
          produce((state: WorkoutStore) => {
            const current = state.exercises.find(el => el.exerciseId === exercise.exerciseId)

            if (!current) {
              throw new Error('Exercise not found')
            }

            current.name = exercise.name.trim()
            current.oneRepMax = exercise.oneRepMax
            current.primaryMuscle = exercise.primaryMuscle?.trim()
          })
        )
      },
      deleteExercise: (exerciseId: string) => {
        set(
          produce((state: WorkoutStore) => {
            const exerciseIndex = state.exercises.findIndex(el => el.exerciseId === exerciseId)
            state.exercises.splice(exerciseIndex, 1)
          })
        )
      },
      updateWorkoutSet: (
        programId: string,
        sessionId: string,
        activityId: string,
        workoutSet: WorkoutSet
      ) => {
        set(
          produce((state: WorkoutStore) => {
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
              activity.mainSets.find(el => el.workoutSetId === workoutSet.workoutSetId) ||
              activity.warmupSets.find(el => el.workoutSetId === workoutSet.workoutSetId)
            if (!current) {
              throw new Error('WorkoutSet not found')
            }

            current.actualReps = workoutSet.actualReps
            current.actualWeight = workoutSet.actualWeight
            current.end = workoutSet.end
            current.start = workoutSet.start
            current.status = workoutSet.status
            current.feedback = workoutSet.feedback
          })
        )
      },
      updateEquipment: (equipment: Equipment) => {
        set(
          produce((state: WorkoutStore) => {
            const current = state.equipment

            current.barbellWeight = equipment.barbellWeight
            current.platePairs = equipment.platePairs
          })
        )
      }
    }),
    {
      name: 'workout-storage',
      onRehydrateStorage: () => (state?: WorkoutStore) => {
        state?.setHasHydrated(true)
      },
      getStorage: () => AsyncStorage,
      deserialize: (serializedState: string) => {
        const storage = JSON.parse(serializedState, (_key, value) =>
          // Dates don't serialize well
          typeof value === 'string' && dateRegex.exec(value) ? new Date(value) : value
        )

        return storage
      }
    }
  )
)

export default useWorkoutStore
