import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import ExerciseForm from '../ExerciseForm'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function ExerciseFormModal({
  route: { params },
  navigation: { goBack }
}: RootStackScreenProps<'ExerciseFormModal'>) {
  const { exercises, updateExercise, addExercise, deleteExercise, programs } = useWorkoutStore(
    state => state
  )
  const exercise = _.find(exercises, { exerciseId: params?.exerciseId })

  return (
    <ModalLayout>
      {exercise ? (
        <ExerciseForm
          changeHandler={updateExercise}
          exercise={exercise}
          deleteHandler={deleteExercise}
          programs={programs}
          exercises={exercises}
          goBack={goBack}
        />
      ) : (
        <ExerciseForm
          changeHandler={addExercise}
          name={params?.name}
          exercises={exercises}
          goBack={goBack}
        />
      )}
    </ModalLayout>
  )
}
