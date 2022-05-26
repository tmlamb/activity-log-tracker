import Papa from 'papaparse'
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { Exercise } from '../types'
import exerciseData from './exerciseData'
import ExerciseDataReducer from './ExerciseDataReducer'

const mockExercises: Partial<Exercise>[] = [
  // {
  //   name: 'Squat',
  //   muscle: 'Quadriceps'
  // },
  // {
  //   name: 'Bench Press',
  //   muscle: 'Chest'
  // },
  // {
  //   name: 'Deadlift',
  //   muscle: 'Back'
  // },
  // {
  //   name: 'Overhead Press',
  //   muscle: 'Deltoids'
  // }
]

type ExerciseDataContextType = {
  exercises: Partial<Exercise>[]
  addExercise: (exercise: Exercise) => void
  reset: (exercises: Partial<Exercise>[]) => void
}

const initialState = {
  exercises: mockExercises,
  reset: () => 0,
  addExercise: () => 0
}

const ExerciseDataContext = createContext<ExerciseDataContextType>(initialState)

export const useExerciseDataState = () => useContext(ExerciseDataContext)
export function ExerciseDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ExerciseDataReducer, initialState)

  const exerciseContextMemoized = useMemo(
    () => ({
      exercises: state.exercises,
      reset: (exercises: Partial<Exercise>[]) => {
        dispatch({
          type: 'RESET',
          payload: exercises
        })
      },
      addExercise: (exercise: Partial<Exercise>) => {
        dispatch({
          type: 'ADD_EXERCISE',
          payload: exercise
        })
      }
    }),
    [state.exercises]
  )

  // Reloads from async storage on mount
  // useEffect(() => {
  //   AsyncStorage.getItem('exerciseData').then(exercises => {
  //     if (exercises) {
  //       dispatch({
  //         type: 'RESET',
  //         payload: JSON.parse(exercises)
  //       })
  //     }
  //   })
  // }, [])

  // Saves to async storage on state change
  // useEffect(() => {
  //   AsyncStorage.setItem('exerciseData', JSON.stringify(state.exercises))
  // }, [state])

  // Reloads from csv file on mount
  useEffect(() => {
    async function getData() {
      const results = Papa.parse<Partial<Exercise>>(exerciseData(), { header: true }) // object with { data, errors, meta }
      const rows = results.data // array of objects

      const exercises: Partial<Exercise>[] = rows.map(row => ({
        name: row.name,
        muscle: row.muscle
      }))
      dispatch({
        type: 'RESET',
        payload: exercises
      })
    }
    getData()
  }, [])

  return (
    <ExerciseDataContext.Provider value={exerciseContextMemoized}>
      {children}
    </ExerciseDataContext.Provider>
  )
}
