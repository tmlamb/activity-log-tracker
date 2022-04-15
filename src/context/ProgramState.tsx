import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { Activity, Program, Session } from '../types'
import ProgramReducer from './ProgramReducer'

const mock: Program[] = [
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
            name: 'TBD',
            activityId: '1',
            warmupSets: 3,
            workSets: 3,
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exercise: {
              name: 'Squat',
              exerciseId: '1',
              muscle: 'Quadriceps',
              oneRepMax: {
                value: 100,
                unit: 'lbs'
              }
            }
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
            name: 'TBD',
            activityId: '1',
            warmupSets: 3,
            workSets: 3,
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exercise: {
              name: 'Squat',
              exerciseId: '1',
              muscle: 'Quadriceps',
              oneRepMax: {
                value: 100,
                unit: 'lbs'
              }
            }
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
            name: 'TBD',
            activityId: '1',
            warmupSets: 3,
            workSets: 3,
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exercise: {
              name: 'Squat',
              exerciseId: '1',
              muscle: 'Quadriceps',
              oneRepMax: {
                value: 100,
                unit: 'lbs'
              }
            }
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
            name: 'TBD',
            activityId: '1',
            warmupSets: 3,
            workSets: 3,
            reps: 5,
            load: {
              value: 77.5,
              type: 'PERCENT'
            },
            rest: 3,
            exercise: {
              name: 'Squat',
              exerciseId: '1',
              muscle: 'Quadriceps',
              oneRepMax: {
                value: 100,
                unit: 'lbs'
              }
            }
          }
        ]
      }
    ],
    icon: 'test',
    programId: '1'
  }
]

type ProgramContextType = {
  programs: Program[]
  addProgram: (program: Program) => void
  deleteProgram: (programId: string) => void
  updateProgram: (program: Program) => void
  addSession: (programId: string, session: Session) => void
  updateSession: (programId: string, session: Session) => void
  deleteSession: (programId: string, sessionId: string) => void
  addActivity: (programId: string, sessionId: string, activity: Activity) => void
  updateActivity: (programId: string, sessionId: string, activity: Activity) => void
  deleteActivity: (programId: string, sessionId: string, activityId: string) => void
  reset: (programs: Program[]) => void
}

const initialState = {
  programs: mock,
  addProgram: () => 0,
  deleteProgram: () => 0,
  updateProgram: () => 0,
  addSession: () => 0,
  updateSession: () => 0,
  deleteSession: () => 0,
  addActivity: () => 0,
  updateActivity: () => 0,
  deleteActivity: () => 0,
  reset: () => 0
}

const ProgramContext = createContext<ProgramContextType>(initialState)

export const useProgramState = () => useContext(ProgramContext)

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ProgramReducer, initialState)

  const programContextMemoized = useMemo(
    () => ({
      programs: state.programs,
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
      reset: (programs: Program[]) => {
        dispatch({
          type: 'RESET',
          payload: programs
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
      }
    }),
    [state.programs]
  )

  // Reloads from async storage on mount
  useEffect(() => {
    AsyncStorage.getItem('programs').then(programs => {
      if (programs) {
        // dispatch({ type: 'RESET', payload: JSON.parse(programs) })
      }
    })
  }, [])

  // Saves to async storage on state change
  useEffect(() => {
    AsyncStorage.setItem('programs', JSON.stringify(state.programs))
  }, [state])

  return (
    <ProgramContext.Provider value={programContextMemoized}>{children}</ProgramContext.Provider>
  )
}
