import Papa from 'papaparse'
import create from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import exerciseData from '../state/exerciseData'
import { Exercise } from '../types'

// interface ExerciseStore {
//   exercises: Partial<Exercise>[]
//   addExercise: (exercise: Exercise) => void
//   // reset: (exercises: Partial<Exercise>[]) => void
// }

function getData() {
  const results = Papa.parse<Partial<Exercise>>(exerciseData(), { header: true })
  const rows = results.data

  const exercises: Partial<Exercise>[] = rows.map(row => ({
    name: row.name,
    muscle: row.muscle
  }))

  return exercises
}

const useExerciseStore = create(
  immer(
    persist(
      () => ({
        exercises: getData()
      }),
      {
        name: 'exercise-storage'
      }
    )
  )
)

export default useExerciseStore
