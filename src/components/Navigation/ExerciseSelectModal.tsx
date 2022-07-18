import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import { Exercise } from '../../types'
import ExerciseSelect from '../ExerciseSelect'
import { useModalSelectStore } from '../ModalSelectInput'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function ExerciseSelectModal({
  route
}: RootStackScreenProps<'ExerciseSelectModal'>) {
  const availableExercises = useExerciseStore(state => state.exercises)
  const usedExercises = useWorkoutStore(state => state.exercises)
  const addExercise = useWorkoutStore(state => state.addExercise)
  const { value, onChangeSelectKey } = route.params

  const onChangeSelect =
    useModalSelectStore(state => state.onChangeSelectMap).get(onChangeSelectKey) ||
    (() => {
      throw Error('select modal opened without a corresponding onChange state key')
    }) // Please this should never happen...

  return (
    <ModalLayout>
      <ExerciseSelect
        exercise={value as Exercise}
        onSelect={onChangeSelect}
        availableExercises={availableExercises}
        usedExercises={usedExercises}
        addExercise={addExercise}
      />
    </ModalLayout>
  )
}
