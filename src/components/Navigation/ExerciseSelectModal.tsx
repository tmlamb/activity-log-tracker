import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useExerciseDataState } from '../../context/ExerciseDataState'
import { useProgramState } from '../../context/ProgramState'
import { StackParamList } from '../../types'
import ExerciseSelect from '../ExerciseSelect'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'ExerciseSelectModal'>
export type ExerciseSelectNavigationProp = Props['navigation']

export default function ExerciseSelectModal({ route }: Props) {
  const { exercises: availableExercises } = useExerciseDataState()
  const { exercises: usedExercises, addExercise } = useProgramState()
  const { value, onChangeSelect } = route.params
  return (
    <ModalLayout>
      <ExerciseSelect
        exerciseId={value}
        onSelect={onChangeSelect}
        availableExercises={availableExercises}
        usedExercises={usedExercises}
        addExercise={addExercise}
      />
    </ModalLayout>
  )
}
