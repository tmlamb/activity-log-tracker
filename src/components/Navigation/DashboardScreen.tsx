import { useFocusEffect } from '@react-navigation/native'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import Dashboard from '../Dashboard'
import ScreenLayout from './ScreenLayout'

export default function DashboardScreen() {
  // This forces the Dashboard to always re-render when visited.
  // This is a kludge to allow device theme changes to reflect
  // without restarting the app, since otherwise the Dashboard
  // may never re-render.
  const [forceRenderKey, setForceRenderKey] = React.useState(0)
  useFocusEffect(
    React.useCallback(() => {
      setForceRenderKey(v => v + 1)
    }, [])
  )

  const programs = useWorkoutStore(state => state.programs)

  return (
    <ScreenLayout key={forceRenderKey}>
      <Dashboard programs={programs} />
    </ScreenLayout>
  )
}
