import React from 'react'
import { View } from 'react-native'
import { useProgramState } from '../../context/ProgramState'
import { tw } from '../../tailwind'
import { Dashboard } from '../Dashboard'

function DashboardScreen() {
  const { programs } = useProgramState()
  return (
    <View style={tw`dark:bg-black`}>
      <Dashboard programs={programs} />
    </View>
  )
}

export default DashboardScreen
