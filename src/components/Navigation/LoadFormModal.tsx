import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import LoadForm from '../LoadForm'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function LoadFormModal({
  route: { params },
  navigation: { goBack, navigate }
}: RootStackScreenProps<'LoadFormModal'>) {
  const { value, exerciseId, parentScreen, parentParams, modalSelectId } = params
  const { exercises, updateExercise } = useWorkoutStore(store => store)
  const exercise = _.find(exercises, { exerciseId })

  if (!exercise && exerciseId) {
    navigate('NotFoundScreen')
    return null
  }

  return (
    <ModalLayout>
      <LoadForm
        load={value}
        exercise={exercise}
        updateExercise={updateExercise}
        parentScreen={parentScreen}
        parentParams={parentParams}
        modalSelectId={modalSelectId}
        goBack={goBack}
      />
    </ModalLayout>
  )
}
