import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { StackParamList } from '../../types'
import ExerciseSelect from '../ExerciseSelect'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'ExerciseSelectModal'>
export type ExerciseSelectNavigationProp = Props['navigation']

export default function ProgramFormModal({ route }: Props) {
  const { exercise, onSelect } = route.params

  return (
    <ModalLayout>
      <ExerciseSelect exercise={exercise} onSelect={onSelect} exercises={[]} />
    </ModalLayout>
  )
}
