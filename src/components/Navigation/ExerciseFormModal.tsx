import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useProgramState } from '../../context/ProgramState'
import { StackParamList } from '../../types'
import ExerciseForm from '../ExerciseForm'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'ExerciseFormModal'>
export type ExerciseFormNavigationProp = Props['navigation']

export default function ExerciseFormModal({ route }: Props) {
  const { exercises, updateExercise, addExercise } = useProgramState()
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
