import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { Activity, Exercise, Program, Session } from '../types'
import ProgramReducer from './ProgramReducer'

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
            warmupSets: 3,
            workSets: 3,
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exerciseId: '1',
            workoutSets: [
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
              },
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
            warmupSets: 3,
            workSets: 3,
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exerciseId: '1',
            workoutSets: [
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
              },
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
            warmupSets: 3,
            workSets: 3,
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exerciseId: '1',
            workoutSets: [
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
              },
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
            warmupSets: 3,
            workSets: 3,
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exerciseId: '1',
            workoutSets: [
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
              },
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
      value: 100,
      unit: 'lbs'
    }
  }
]

type ProgramContextType = {
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
  addWorkoutSet: (programId: string, sessionId: string, activityId: string, workoutSet: any) => void
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: any
  ) => void
  deleteWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSetId: string
  ) => void
}

const initialState = {
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
  addWorkoutSet: () => 0,
  updateWorkoutSet: () => 0,
  deleteWorkoutSet: () => 0
}

const ProgramContext = createContext<ProgramContextType>(initialState)

export const useProgramState = () => useContext(ProgramContext)

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ProgramReducer, initialState)

  const programContextMemoized = useMemo(
    () => ({
      programs: state.programs,
      exercises: state.exercises,
      addProgram: (program: Program) => {
        dispatch({
          type: 'ADD_PROGRAM',
          payload: program
        })
      },
      deleteProgram: (programId: string) => {
        dispatch({
          type: 'DELETE_PROGRAM',
          payload: { programId }
        })
      },
      updateProgram: (program: Program) => {
        dispatch({
          type: 'UPDATE_PROGRAM',
          payload: program
        })
      },
      reset: (programs: Program[], exercises: Exercise[]) => {
        dispatch({
          type: 'RESET',
          payload: { programs, exercises }
        })
      },
      addSession: (programId: string, session: Session) => {
        dispatch({
          type: 'ADD_SESSION',
          payload: { programId, session }
        })
      },
      updateSession: (programId: string, session: Session) => {
        dispatch({
          type: 'UPDATE_SESSION',
          payload: { programId, session }
        })
      },
      deleteSession: (programId: string, sessionId: string) => {
        dispatch({
          type: 'DELETE_SESSION',
          payload: { programId, sessionId }
        })
      },
      addActivity: (programId: string, sessionId: string, activity: Activity) => {
        dispatch({
          type: 'ADD_ACTIVITY',
          payload: { programId, sessionId, activity }
        })
      },
      updateActivity: (programId: string, sessionId: string, activity: Activity) => {
        dispatch({
          type: 'UPDATE_ACTIVITY',
          payload: { programId, sessionId, activity }
        })
      },
      deleteActivity: (programId: string, sessionId: string, activityId: string) => {
        dispatch({
          type: 'DELETE_ACTIVITY',
          payload: { programId, sessionId, activityId }
        })
      },
      addExercise: (exercise: Exercise) => {
        dispatch({
          type: 'ADD_EXERCISE',
          payload: exercise
        })
      },
      updateExercise: (exercise: Exercise) => {
        dispatch({
          type: 'UPDATE_EXERCISE',
          payload: exercise
        })
      },
      addWorkoutSet: (
        programId: string,
        sessionId: string,
        activityId: string,
        workoutSet: any
      ) => {
        dispatch({
          type: 'ADD_WORKOUT_SET',
          payload: { programId, sessionId, activityId, workoutSet }
        })
      },
      updateWorkoutSet: (
        programId: string,
        sessionId: string,
        activityId: string,
        workoutSet: any
      ) => {
        dispatch({
          type: 'UPDATE_WORKOUT_SET',
          payload: { programId, sessionId, activityId, workoutSet }
        })
      },
      deleteWorkoutSet: (
        programId: string,
        sessionId: string,
        activityId: string,
        workoutSetId: string
      ) => {
        dispatch({
          type: 'DELETE_WORKOUT_SET',
          payload: { programId, sessionId, activityId, workoutSetId }
        })
      }
    }),
    [state.programs, state.exercises]
  )

  // Reloads from async storage on mount
  useEffect(() => {
    AsyncStorage.getItem('programs').then(programs => {
      if (programs) {
        AsyncStorage.getItem('exercises').then(exercises => {
          if (exercises) {
            // dispatch({
            //   type: 'RESET',
            //   payload: { programs: JSON.parse(programs), exercises: JSON.parse(exercises) }
            // })
          }
        })
      }
    })
  }, [])

  // Saves to async storage on state change
  useEffect(() => {
    AsyncStorage.setItem('programs', JSON.stringify(state.programs))
    AsyncStorage.setItem('exercises', JSON.stringify(state.exercises))
  }, [state])

  return (
    <ProgramContext.Provider value={programContextMemoized}>{children}</ProgramContext.Provider>
  )
}
