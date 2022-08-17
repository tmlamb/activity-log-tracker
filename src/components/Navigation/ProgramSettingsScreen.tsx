import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import ProgramSettings from '../ProgramSettings'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function ProgramSettingsScreen({
  navigation: { goBack }
}: RootStackScreenProps<'ProgramSettingsScreen'>) {
  const { programs } = useWorkoutStore(state => state)
  return (
    <ScreenLayout>
      <ProgramSettings programs={programs} goBack={goBack} />
    </ScreenLayout>
  )
}
