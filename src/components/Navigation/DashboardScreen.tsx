import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import { Dashboard } from '../Dashboard'
import ScreenLayout from './ScreenLayout'

function DashboardScreen() {
  const programs = useWorkoutStore(state => state.programs)
  return (
    <ScreenLayout>
      <Dashboard programs={programs} />
    </ScreenLayout>
  )
}

export default DashboardScreen
