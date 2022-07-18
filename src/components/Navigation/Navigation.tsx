import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import DashboardScreen from './DashboardScreen'
import ExerciseFormModal from './ExerciseFormModal'
import ExerciseSelectModal from './ExerciseSelectModal'
import ExerciseSettingsScreen from './ExerciseSettingsScreen'
import LoadFormModal from './LoadFormModal'
import ProgramDetailScreen from './ProgramDetailScreen'
import ProgramFormModal from './ProgramFormModal'
import SessionDetailScreen from './SessionDetailScreen'
import SessionFormModal from './SessionFormModal'
import SettingsScreen from './SettingsScreen'
import { RootStackParamList } from './types'
import WorkoutSetDetailScreen from './WorkoutSetDetailScreen'

const AppStack = createNativeStackNavigator<RootStackParamList>()

export default function Navigation() {
  return (
    <NavigationContainer>
      <AppStack.Navigator
        // Modals are too easy to dismiss by gesture - We will force users to use a
        // "Cancel" button to avoid unintended data loss.
        screenOptions={{ gestureEnabled: false }}
        initialRouteName="DashboardScreen"
      >
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
        <AppStack.Screen
          name="SessionDetailScreen"
          component={SessionDetailScreen}
          options={{ title: 'Workout Session' }}
        />
        <AppStack.Screen
          name="WorkoutSetDetailScreen"
          component={WorkoutSetDetailScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <AppStack.Screen
          name="SettingsScreen"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <AppStack.Screen
          name="ExerciseSettingsScreen"
          component={ExerciseSettingsScreen}
          options={{ title: 'Manage Exercises' }}
        />
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
            options={() => ({
              title: 'Select Load'
            })}
          />
          <AppStack.Screen
            name="ExerciseSelectModal"
            component={ExerciseSelectModal}
            options={() => ({
              title: 'Select Exercise'
            })}
          />
          <AppStack.Screen
            name="ExerciseFormModal"
            component={ExerciseFormModal}
            options={({ route }) => ({
              title: route.params && route.params.exerciseId ? 'Edit Exercise' : 'Add Exercise'
            })}
          />
        </AppStack.Group>
      </AppStack.Navigator>
    </NavigationContainer>
  )
}
