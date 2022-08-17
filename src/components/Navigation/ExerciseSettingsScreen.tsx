import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import ExerciseSettings from '../ExerciseSettings'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

function ExerciseSettingsScreen({
  navigation: { goBack }
}: RootStackScreenProps<'ExerciseSettingsScreen'>) {
  const availableExercises = useExerciseStore(state => state.exercises)
  const usedExercises = useWorkoutStore(state => state.exercises)

  return (
    <ScreenLayout>
      <ExerciseSettings
        availableExercises={availableExercises}
        usedExercises={usedExercises}
        goBack={goBack}
      />
    </ScreenLayout>
  )
}

export default ExerciseSettingsScreen
