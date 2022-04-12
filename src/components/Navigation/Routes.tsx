import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { StackParamList } from '../../types'
import ActivityDetailScreen from './ActivityDetailScreen'
import DashboardScreen from './DashboardScreen'
import ProgramDetailScreen from './ProgramDetailScreen'
import ProgramFormModal from './ProgramFormModal'
import SessionDetailScreen from './SessionDetailScreen'

const AppStack = createNativeStackNavigator<StackParamList>()

export default function Routes() {
  return (
    <AppStack.Navigator initialRouteName="DashboardScreen">
      <AppStack.Screen
        name="DashboardScreen"
        component={DashboardScreen}
        options={{
          title: ''
        }}
      />
      <AppStack.Screen name="ProgramDetailScreen" component={ProgramDetailScreen} />
      <AppStack.Screen name="SessionDetailScreen" component={SessionDetailScreen} />
      <AppStack.Screen name="ActivityDetailScreen" component={ActivityDetailScreen} />
      <AppStack.Group screenOptions={{ presentation: 'modal' }}>
        <AppStack.Screen
          name="ProgramFormModal"
          component={ProgramFormModal}
          options={() => ({
            title: 'Add Program'
          })}
        />
      </AppStack.Group>
    </AppStack.Navigator>
  )
}
