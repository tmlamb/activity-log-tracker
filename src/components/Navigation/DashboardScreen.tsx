import React from 'react'
import useWorkoutStore from '../../context/store'
import { Dashboard } from '../Dashboard'
import ScreenLayout from './ScreenLayout'

function DashboardScreen() {
  const { programs } = useWorkoutStore()
  return (
    <ScreenLayout>
      <Dashboard programs={programs} />
    </ScreenLayout>
  )
}

export default DashboardScreen
