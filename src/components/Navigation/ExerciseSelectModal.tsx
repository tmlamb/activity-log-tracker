import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import { StackParamList } from '../../types'
import ExerciseSelect from '../ExerciseSelect'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'ExerciseSelectModal'>
export type ExerciseSelectNavigationProp = Props['navigation']

export default function ExerciseSelectModal({ route }: Props) {
  const availableExercises = useExerciseStore(state => state.exercises)
  const usedExercises = useWorkoutStore(state => state.exercises)
  const addExercise = useWorkoutStore(state => state.addExercise)
  const { value, onChangeSelect } = route.params

  return (
    <ModalLayout>
      <ExerciseSelect
        exercise={value}
        onSelect={onChangeSelect}
        availableExercises={availableExercises}
        usedExercises={usedExercises}
        addExercise={addExercise}
      />
    </ModalLayout>
  )
}
