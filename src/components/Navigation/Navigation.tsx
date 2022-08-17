import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { Platform } from 'react-native'
import tw from '../../tailwind'
import DashboardScreen from './DashboardScreen'
import EquipmentSettingsScreen from './EquipmentSettingsScreen'
import ExerciseFormModal from './ExerciseFormModal'
import ExerciseSelectModal from './ExerciseSelectModal'
import ExerciseSettingsModal from './ExerciseSettingsModal'
import ExerciseSettingsScreen from './ExerciseSettingsScreen'
import LoadFormModal from './LoadFormModal'
import PrivacyScreen from './PrivacyScreen'
import ProgramDetailScreen from './ProgramDetailScreen'
import ProgramFormModal from './ProgramFormModal'
import ProgramSettingsScreen from './ProgramSettingsScreen'
import SessionDetailScreen from './SessionDetailScreen'
import SessionFormModal from './SessionFormModal'
import SessionSelectModal from './SessionSelectModal'
import SettingsScreen from './SettingsScreen'
import { RootStackParamList, SessionFormNavParams } from './types'
import WorkoutSetDetailScreen from './WorkoutSetDetailScreen'

const AppStack = createNativeStackNavigator<RootStackParamList>()

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1'

export default function Navigation() {
  const [isReady, setIsReady] = React.useState(false)
  const [initialState, setInitialState] = React.useState()

  React.useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY)
        const state = savedStateString ? JSON.parse(savedStateString) : undefined

        if (state !== undefined) {
          setInitialState(state)
        }
      } finally {
        setIsReady(true)
      }
    }

    if (!isReady) {
      restoreState()
    }
  }, [isReady])

  if (!isReady) {
    return null
  }

  const config = {
    screens: {
      DashboardScreen: '',
      PrivacyScreen: 'privacy',
      EquipmentSettingsScreen: 'equipment/settings',
      ExerciseFormModal: 'exercise/form/:exerciseId?',
      ExerciseSelectModal: 'exercise/select',
      ExerciseSettingsModal: 'exercise/settings/modal',
      ExerciseSettingsScreen: 'exercise/settings',
      LoadFormModal: 'load',
      ProgramDetailScreen: 'program/:programId',
      ProgramFormModal: 'program/form/:programId?',
      ProgramSettingsScreen: 'program/settings',
      SessionDetailScreen: 'program/:programId/session/:sessionId',
      SessionFormModal: 'program/:programId/session/form/:sessionId?',
      SessionSelectModal: 'session/select',
      SettingsScreen: 'settings',
      WorkoutSetDetailScreen: 'program/:programId/session/:sessionId/set/:workoutSetId',
      NotFound: '*'
    }
  }

  const linking = {
    prefixes: ['https://walt.website', 'https://*.walt.website'],
    config
  }

  return (
    <NavigationContainer
      linking={linking}
      initialState={initialState}
      onStateChange={state => AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))}
    >
      <AppStack.Navigator
        screenOptions={{
          // Modals are too easy to dismiss by gesture - We will force users to use a
          // "Cancel" button to avoid unintended data loss.
          gestureEnabled: false,
          headerBackTitleVisible: Platform.OS !== 'android',
          headerTitleAlign: 'center'
        }}
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
            headerBackTitleStyle: tw.style('self-center'),
            animation: 'fade_from_bottom'
          }}
        />
        <AppStack.Screen
          name="ExerciseSettingsModal"
          component={ExerciseSettingsModal}
          options={{
            title: 'Manage Exercises',
            presentation: 'modal',
            gestureEnabled: true
          }}
        />
        <AppStack.Screen
          name="ExerciseSettingsScreen"
          component={ExerciseSettingsScreen}
          options={{
            title: 'Manage Exercises'
          }}
        />
        <AppStack.Screen
          name="ProgramSettingsScreen"
          component={ProgramSettingsScreen}
          options={{ title: 'Manage Programs' }}
        />
        <AppStack.Screen
          name="EquipmentSettingsScreen"
          component={EquipmentSettingsScreen}
          options={{ title: 'Manage Equipment', headerBackVisible: false }}
        />
        <AppStack.Screen
          name="ExerciseSelectModal"
          component={ExerciseSelectModal}
          options={() => ({
            title: 'Select Exercise',
            presentation: 'modal'
          })}
        />
        <AppStack.Screen
          name="SessionFormModal"
          component={SessionFormModal}
          options={({ route }) => ({
            title:
              route.params && (route.params as Readonly<SessionFormNavParams>).sessionId
                ? 'Edit Session'
                : 'Add Session',
            presentation: 'modal'
          })}
        />
        <AppStack.Screen
          name="PrivacyScreen"
          component={PrivacyScreen}
          options={() => ({
            title: 'Privacy Policy'
          })}
        />
        <AppStack.Screen
          name="NotFound"
          component={DashboardScreen}
          options={{
            headerTitle: '',
            title: 'Activity Log Tracker'
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
            name="LoadFormModal"
            component={LoadFormModal}
            options={() => ({
              title: 'Select Load'
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
  )
}
