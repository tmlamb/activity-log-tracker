import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { View } from 'react-native'
import tw from '../../tailwind'
import DashboardScreen from './DashboardScreen'
import EquipmentSettingsScreen from './EquipmentSettingsScreen'
import ExerciseFormModal from './ExerciseFormModal'
import ExerciseSelectModal from './ExerciseSelectModal'
import ExerciseSettingsScreen from './ExerciseSettingsScreen'
import LoadFormModal from './LoadFormModal'
import ProgramDetailScreen from './ProgramDetailScreen'
import ProgramFiguresScreen from './ProgramFiguresScreen'
import ProgramFormModal from './ProgramFormModal'
import ProgramSettingsScreen from './ProgramSettingsScreen'
import SessionDetailScreen from './SessionDetailScreen'
import SessionFormModal from './SessionFormModal'
import SessionSelectModal from './SessionSelectModal'
import SettingsScreen from './SettingsScreen'
import { RootStackParamList, SessionFormNavParams } from './types'
import WorkoutSetDetailScreen from './WorkoutSetDetailScreen'

const AppStack = createNativeStackNavigator<RootStackParamList>()

export default function Navigation() {
  return (
    <View style={tw`flex-1 bg-slate-50 dark:bg-black`}>
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
              title: 'Workout Program',
              headerBackTitle: 'Back',
              headerBackTitleStyle: tw.style('self-center')
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
            options={{
              title: 'Settings',
              headerBackTitle: 'Back',
              headerBackTitleStyle: tw.style('self-center')
            }}
          />
          <AppStack.Screen
            name="ExerciseSettingsScreen"
            component={ExerciseSettingsScreen}
            options={{ title: 'Manage Exercises' }}
          />
          <AppStack.Screen
            name="ProgramSettingsScreen"
            component={ProgramSettingsScreen}
            options={{ title: 'Manage Programs' }}
          />
          <AppStack.Screen
            name="EquipmentSettingsScreen"
            component={EquipmentSettingsScreen}
            options={{ title: 'Manage Equipment' }}
          />
          <AppStack.Screen
            name="ProgramFiguresScreen"
            component={ProgramFiguresScreen}
            options={{
              title: 'Program Data'
            }}
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
                title:
                  route.params && (route.params as Readonly<SessionFormNavParams>).sessionId
                    ? 'Edit Session'
                    : 'Add Session'
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
              name="SessionSelectModal"
              component={SessionSelectModal}
              options={() => ({
                title: 'Select Template'
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
    </View>
  )
}
