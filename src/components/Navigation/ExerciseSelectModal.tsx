import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import { Exercise } from '../../types'
import ExerciseSelect from '../ExerciseSelect'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function ExerciseSelectModal({
  route
}: RootStackScreenProps<'ExerciseSelectModal'>) {
  const availableExercises = useExerciseStore(state => state.exercises)
  const usedExercises = useWorkoutStore(state => state.exercises)
  const addExercise = useWorkoutStore(state => state.addExercise)
  const { value, parentScreen, parentParams, modalSelectId } = route.params

  return (
    <ModalLayout>
      <ExerciseSelect
        exercise={value as Exercise}
        availableExercises={availableExercises}
        usedExercises={usedExercises}
        addExercise={addExercise}
        parentScreen={parentScreen}
        parentParams={parentParams}
        modalSelectId={modalSelectId}
      />
    </ModalLayout>
  )
}
