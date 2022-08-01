import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import ExerciseSettings from '../ExerciseSettings'
import ModalLayout from './ModalLayout'
import ScreenLayout from './ScreenLayout'

function ExerciseSettingsModal() {
  const availableExercises = useExerciseStore(state => state.exercises)
  const usedExercises = useWorkoutStore(state => state.exercises)

  return (
    <ModalLayout>
      <ExerciseSettings availableExercises={availableExercises} usedExercises={usedExercises} />
    </ModalLayout>
  )
}

export default ExerciseSettingsModal
