import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { StackParamList } from '../../types'
import ActivityDetailScreen from './ActivityDetailScreen'
import DashboardScreen from './DashboardScreen'
import LoadFormModal from './LoadFormModal'
import ProgramDetailScreen from './ProgramDetailScreen'
import ProgramFormModal from './ProgramFormModal'
import SessionDetailScreen from './SessionDetailScreen'
import SessionFormModal from './SessionFormModal'

const AppStack = createNativeStackNavigator<StackParamList>()

export default function Routes() {
  return (
    <AppStack.Navigator initialRouteName="DashboardScreen">
      <AppStack.Screen
        name="DashboardScreen"
        component={DashboardScreen}
        options={{
          headerTitle: '',
          title: 'Activity Log Tracker'
        }}
      />
      <AppStack.Screen
        name="ProgramDetailScreen"
        component={ProgramDetailScreen}
        options={{
          title: 'Workout Program'
        }}
      />
      <AppStack.Screen name="SessionDetailScreen" component={SessionDetailScreen} />
      <AppStack.Screen name="ActivityDetailScreen" component={ActivityDetailScreen} />
      <AppStack.Group screenOptions={{ presentation: 'modal' }}>
        <AppStack.Screen
          name="ProgramFormModal"
          component={ProgramFormModal}
          options={({ route }) => ({
            title: route.params && route.params.programId ? 'Edit Program' : 'Add Program'
          })}
        />
        <AppStack.Screen
          name="SessionFormModal"
          component={SessionFormModal}
          options={({ route }) => ({
            title: route.params && route.params.sessionId ? 'Edit Session' : 'Add Session'
          })}
        />
        <AppStack.Screen
          name="LoadFormModal"
          component={LoadFormModal}
          options={({ route }) => ({
            title: 'Select Load'
          })}
        />
      </AppStack.Group>
    </AppStack.Navigator>
  )
}
