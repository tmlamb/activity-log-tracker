import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import ProgramSettings from '../ProgramSettings'
import ScreenLayout from './ScreenLayout'

export default function ProgramSettingsScreen() {
  const { programs } = useWorkoutStore(state => state)
  return (
    <ScreenLayout>
      <ProgramSettings programs={programs} />
    </ScreenLayout>
  )
}
