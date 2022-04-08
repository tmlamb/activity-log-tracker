import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { Program } from '../types'
import ProgramReducer from './ProgramReducer'

export const mock: Program[] = [
  {
    name: 'Strength',
    sessions: [
      {
        name: 'Chest',
        id: '1',
        start: new Date(),
        end: undefined,
        activities: [
          {
            id: '1',
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
              id: '1',
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
    type: 'Workout Program',
    id: '1'
  }
]

type ProgramContextType = {
  programs: Program[]
  addProgram: (program: Program) => void
  deleteProgram: (id: string) => void
  updateProgram: (program: Program) => void
  reset: (programs: Program[]) => void
}

const initialState = {
  programs: mock,
  addProgram: () => 0,
  deleteProgram: () => 0,
  updateProgram: () => 0,
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
      deleteProgram: (id: string) => {
        dispatch({
          type: 'DELETE_PROGRAM',
          payload: { id }
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
      }
    }),
    [state.programs]
  )

  // Reloads from async storage on mount
  useEffect(() => {
    AsyncStorage.getItem('programs').then(programs => {
      if (programs) {
        dispatch({ type: 'RESET', payload: JSON.parse(programs) })
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
