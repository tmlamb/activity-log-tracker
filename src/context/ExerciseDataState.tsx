import React, { createContext, useContext, useMemo, useReducer } from 'react'
// import { exerciseCsvFile } from '../../assets/exercises.csv'
import { Exercise } from '../types'
import ExerciseDataReducer from './ExerciseDataReducer'

const mockExercises: Partial<Exercise>[] = [
  {
    name: 'Squat',
    muscle: 'Quadriceps'
  },
  {
    name: 'Bench Press',
    muscle: 'Chest'
  },
  {
    name: 'Deadlift',
    muscle: 'Back'
  },
  {
    name: 'Overhead Press',
    muscle: 'Deltoids'
  }
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
  //   useEffect(() => {
  // AsyncStorage.getItem('exerciseData').then(exercises => {
  //   if (exercises) {
  //     dispatch({
  //       type: 'RESET',
  //       payload: JSON.parse(exercises)
  //     })
  //   }
  // })
  //   }, [])

  // Reloads from csv file on mount
  //   useEffect(() => {
  // const csvFile = exerciseCsvFile
  // const exercises = csvFile
  //   .split('\n')
  //   .map((line: { split: (arg0: string) => [unknown, unknown] }) => {
  //     const [name, muscle] = line.split(',')
  //     return { name, muscle }
  //   })
  // dispatch({
  //   type: 'RESET',
  //   payload: exercises
  // })
  //   }, [])

  return (
    <ExerciseDataContext.Provider value={exerciseContextMemoized}>
      {children}
    </ExerciseDataContext.Provider>
  )
}
