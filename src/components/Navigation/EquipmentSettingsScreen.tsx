import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import EquipmentSettings from '../EquipmentSettings'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

function ExerciseSettingsScreen({
  navigation: { goBack }
}: RootStackScreenProps<'ExerciseSettingsScreen'>) {
  const { equipment, updateEquipment } = useWorkoutStore(state => state)

  return (
    <ScreenLayout>
      <EquipmentSettings equipment={equipment} updateEquipment={updateEquipment} goBack={goBack} />
    </ScreenLayout>
  )
}

export default ExerciseSettingsScreen
