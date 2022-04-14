import React from 'react'
import { useProgramState } from '../../context/ProgramState'
import { Dashboard } from '../Dashboard'
import ScreenLayout from './ScreenLayout'

function DashboardScreen() {
  const { programs } = useProgramState()
  return (
    <ScreenLayout>
      <Dashboard programs={programs} />
    </ScreenLayout>
  )
}

export default DashboardScreen
