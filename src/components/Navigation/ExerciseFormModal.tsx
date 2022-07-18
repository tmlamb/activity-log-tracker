import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import ExerciseForm from '../ExerciseForm'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function ExerciseFormModal({ route }: RootStackScreenProps<'ExerciseFormModal'>) {
  const exercises = useWorkoutStore(state => state.exercises)
  const updateExercise = useWorkoutStore(state => state.updateExercise)
  const addExercise = useWorkoutStore(state => state.addExercise)
  const deleteExercise = useWorkoutStore(state => state.deleteExercise)
  const programs = useWorkoutStore(state => state.programs)
  const exercise = route.params
    ? exercises.find(p => p.exerciseId === route.params?.exerciseId)
    : undefined

  const name = route.params?.name

  return (
    <ModalLayout>
      {exercise ? (
        <ExerciseForm
          changeHandler={updateExercise}
          exercise={exercise}
          deleteHandler={deleteExercise}
          programs={programs}
          exercises={exercises}
        />
      ) : (
        <ExerciseForm changeHandler={addExercise} name={name} exercises={exercises} />
      )}
    </ModalLayout>
  )
}
