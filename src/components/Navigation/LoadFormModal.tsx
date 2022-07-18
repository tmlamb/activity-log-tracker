import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import LoadForm from '../LoadForm'
import { useModalSelectStore } from '../ModalSelectInput'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function LoadFormModal({ route }: RootStackScreenProps<'LoadFormModal'>) {
  const { value, onChangeSelectKey, exerciseId } = route.params
  const exercises = useWorkoutStore(store => store.exercises)
  const exercise = exercises.find(e => e.exerciseId === exerciseId)
  const updateExercise = useWorkoutStore(store => store.updateExercise)

  const onChangeSelect =
    useModalSelectStore(state => state.onChangeSelectMap).get(onChangeSelectKey) ||
    (() => {
      throw Error('select modal opened without a corresponding onChange state key')
    }) // Please this should never happen...

  return (
    <ModalLayout>
      <LoadForm
        load={value}
        exercise={exercise}
        updateExercise={updateExercise}
        onSelect={onChangeSelect}
      />
    </ModalLayout>
  )
}
