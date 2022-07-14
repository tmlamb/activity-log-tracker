import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import { StackParamList } from '../../types'
import ExerciseSettings from '../ExerciseSettings'
import ScreenLayout from './ScreenLayout'

type Props = NativeStackScreenProps<StackParamList, 'ExerciseSettingsScreen'>
export type ExerciseSettingsNavigationProp = Props['navigation']

function ExerciseSettingsScreen() {
  const availableExercises = useExerciseStore(state => state.exercises)
  const usedExercises = useWorkoutStore(state => state.exercises)

  return (
    <ScreenLayout>
      <ExerciseSettings availableExercises={availableExercises} usedExercises={usedExercises} />
    </ScreenLayout>
  )
}

export default ExerciseSettingsScreen
