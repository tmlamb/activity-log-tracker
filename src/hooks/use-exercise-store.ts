import Papa from 'papaparse'
import create from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { Exercise } from '../types'
import { sortByName } from '../utils'

const exerciseData = `name
Back Squat
Dumbbell Incline Press
Lying Leg Curl
Pronated Pulldown
Supinated EZ Bar Curl
Hanging Leg Raise
Barbell Bench Press
Low To High Cable Fly
Barbell Hip Thrust
Romanian Deadlift
Chest-supported T-Bar Row
Arnold Press
Tricep Press-down
Dumbbell Shrug
Hex Bar Shrug
Smith Machine Shrug 
Weighted Pull-up
Humble Row
Leg Press
Standing Calf Raise
Cable Rope Upright Row
Hammer Curl
Deadlift
Weighted Dip
Glute Ham Raise
Leg Extension
Cable Pull-over
Dumbbell Lateral Raise
EZ Bar Skull Crusher
Overhead Press
Egyptian Lateral Raise
Cable Seated Row
Seated Hip Abduction
Incline Dumbbell Curl
Bicycle Crunch
Push-up
Swiss Ball Leg Curl
Chin-up
Ab Wheel Rollout
Low Incline Dumbbell Press
Dumbbell Row
Overhead Tricep Extension
Single-Leg Leg Press
Decline Bench Press
Pendlay Row
EZ Bar Curl 21s
Cable Crunch
Lat Pulldown
Rope Face Pull
Tricep Kickback
Dumbbell Lunge
Cable Upright Row
Sissy Squat
Reverse Dumbbell Fly
Skull Crusher
Lateral Band Walk`

function getData() {
  const results = Papa.parse<Partial<Exercise>>(exerciseData, { header: true })
  const rows = results.data

  sortByName(rows)

  const exercises: Partial<Exercise>[] = rows.map(row => ({
    name: row.name
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
