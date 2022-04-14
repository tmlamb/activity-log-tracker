import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { Program } from '../types'
import ProgramReducer from './ProgramReducer'

const mock: Program[] = [
  {
    name: 'Strength',
    sessions: [
      {
        name: 'Chest',
        entityId: '1',
        start: new Date('2022-04-11T00:00:00.000Z'),
        end: undefined,
        activities: [
          {
            name: 'TBD',
            entityId: '1',
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
              entityId: '1',
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
    entityId: '1'
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
      deleteProgram: (entityId: string) => {
        dispatch({
          type: 'DELETE_PROGRAM',
          payload: { entityId }
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
