import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import SingleActivity from './src/screens/SingleActivity'
import SingleLog from './src/screens/SingleLog'
import Tracker from './src/screens/Tracker'

export type StackParamList = {
  Logs: undefined
  SingleLog: { logId: string; name: string }
  SingleActivity: { logId: string; activityId: string; name: string }
}

const AppStack = createNativeStackNavigator<StackParamList>()

function App() {
  return (
    <NavigationContainer>
      <AppStack.Navigator initialRouteName="Logs">
        <AppStack.Screen name="Logs" component={Tracker} />
        <AppStack.Screen
          name="SingleLog"
          component={SingleLog}
          options={({ route }) => ({ title: route.params.name })}
        />
        <AppStack.Screen
          name="SingleActivity"
          component={SingleActivity}
          options={({ route }) => ({ title: route.params.name })}
        />
      </AppStack.Navigator>
    </NavigationContainer>
  )
}

export default App
