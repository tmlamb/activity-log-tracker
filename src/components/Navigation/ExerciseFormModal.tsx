import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import { StackParamList } from '../../types'
import ExerciseForm from '../ExerciseForm'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'ExerciseFormModal'>
export type ExerciseFormNavigationProp = Props['navigation']

export default function ExerciseFormModal({ route }: Props) {
  const exercises = useWorkoutStore(state => state.exercises)
  const updateExercise = useWorkoutStore(state => state.updateExercise)
  const addExercise = useWorkoutStore(state => state.addExercise)
  const exercise = route.params
    ? exercises.find(p => p.exerciseId === route.params?.exerciseId)
    : undefined

  return (
    <ModalLayout>
      {exercise ? (
        <ExerciseForm changeHandler={updateExercise} exercise={exercise} />
      ) : (
        <ExerciseForm changeHandler={addExercise} />
      )}
    </ModalLayout>
  )
}
