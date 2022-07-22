import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import { Exercise } from '../../types'
import ExerciseSelect from '../ExerciseSelect'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function ExerciseSelectModal({
  route: { params }
}: RootStackScreenProps<'ExerciseSelectModal'>) {
  const availableExercises = useExerciseStore(state => state.exercises)
  const { exercises: usedExercises, addExercise } = useWorkoutStore(state => state)
  const { value, parentScreen, parentParams, modalSelectId } = params

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
