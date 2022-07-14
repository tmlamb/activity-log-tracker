import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import ExerciseSettings from '../ExerciseSettings'
import ScreenLayout from './ScreenLayout'

function ExerciseSettingsScreen() {
  const availableExercises = useExerciseStore(state => state.exercises)
  const usedExercises = useWorkoutStore(state => state.exercises)

  return (
    <ScreenLayout>
      <ExerciseSettings availableExercises={availableExercises} usedExercises={usedExercises} />
    </ScreenLayout>
  )
}

export default ExerciseSettingsScreen
