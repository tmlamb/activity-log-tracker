import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import LoadForm from '../LoadForm'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function LoadFormModal({ route }: RootStackScreenProps<'LoadFormModal'>) {
  const { value, exerciseId, parentScreen, parentParams, modalSelectId } = route.params
  const exercises = useWorkoutStore(store => store.exercises)
  const exercise = exercises.find(e => e.exerciseId === exerciseId)
  const updateExercise = useWorkoutStore(store => store.updateExercise)

  return (
    <ModalLayout>
      <LoadForm
        load={value}
        exercise={exercise}
        updateExercise={updateExercise}
        parentScreen={parentScreen}
        parentParams={parentParams}
        modalSelectId={modalSelectId}
      />
    </ModalLayout>
  )
}
