import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { Linking, Platform } from 'react-native'
import tw from '../../tailwind'
import DashboardScreen from './DashboardScreen'
import EquipmentSettingsScreen from './EquipmentSettingsScreen'
import ExerciseFormModal from './ExerciseFormModal'
import ExerciseSelectModal from './ExerciseSelectModal'
import ExerciseSettingsModal from './ExerciseSettingsModal'
import ExerciseSettingsScreen from './ExerciseSettingsScreen'
import LoadFormModal from './LoadFormModal'
import NotFoundScreen from './NotFoundScreen'
import ProgramDataScreen from './ProgramDataScreen'
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

const linking = {
  prefixes: ['https://walt.website', 'https://*.walt.website'],
  config: {
    screens: {
      DashboardScreen: '',
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
      NotFoundScreen: '*'
    }
  }
}

export default function Navigation() {
  // Using nav state persistence on web to allow users to refresh the browser while
  // staying on the same page and retaining ability to use goBack.
  const [isNavStateReady, setIsNavStateReady] = React.useState(Platform.OS !== 'web')
  const [initialState, setInitialState] = React.useState()

  React.useEffect(() => {
    const restoreState = async () => {
      try {
        const visitedPath = new URL((await Linking.getInitialURL()) || '/').pathname.substring(1)
        const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY)
        const state = savedStateString ? JSON.parse(savedStateString) : undefined

        const visitedPathParts = visitedPath.split('/')

        // Check if the visited path is a valid path for the app.
        const foundPath = Object.values(linking.config.screens).find(knownPath => {
          const knownPathParts = knownPath.split('/')
          const lastKnownPathPart = knownPathParts[knownPathParts.length - 1]
          // If the number of parts to the path are different, no match (with path params optional)
          if (
            knownPathParts.length - (lastKnownPathPart.startsWith(':') ? 1 : 0) !==
              visitedPathParts?.length &&
            knownPathParts.length !== visitedPathParts?.length
          ) {
            return false
          }

          // Check each part to see if there is a non-matching section
          return (
            knownPathParts.findIndex((knownPathPart, index) => {
              // Dynamic parts can be ignored
              if (knownPathPart.startsWith(':')) {
                return false
              }
              return knownPathPart !== visitedPathParts[index]
            }) === -1
          )
        })

        // Only load the persisted state if the user is visiting a valid path, and if the path is not
        // the home dashboard screen
        if (state && foundPath && visitedPath !== '') {
          setInitialState(state)
        }
      } finally {
        setIsNavStateReady(true)
      }
    }

    if (!isNavStateReady) {
      restoreState()
    }
  }, [isNavStateReady])

  if (!isNavStateReady) {
    return null
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
          headerTitleAlign: 'center',
          // The following two settings fix background flashing issues when changes screens on web
          headerStyle: tw`web:bg-slate-50 web:dark:bg-black`,
          headerShadowVisible: Platform.OS !== 'web'
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
          name="ProgramDataScreen"
          component={ProgramDataScreen}
          options={{
            title: 'Program Data',
            headerBackTitle: 'Back',
            headerBackTitleStyle: tw.style('self-center')
          }}
        />
        <AppStack.Screen
          name="SessionDetailScreen"
          component={SessionDetailScreen}
          options={{ title: 'Workout Session', headerBackTitle: 'Program' }}
        />
        <AppStack.Screen
          name="WorkoutSetDetailScreen"
          component={WorkoutSetDetailScreen}
          options={({ route }) => ({ title: route.params.title, headerBackTitle: 'Session' })}
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
              route.params && (route.params as SessionFormNavParams).sessionId
                ? 'Edit Session'
                : 'Add Session',
            presentation: 'modal'
          })}
        />
        <AppStack.Screen
          name="NotFoundScreen"
          component={NotFoundScreen}
          options={{
            title: 'Oops...'
          }}
        />
        <AppStack.Screen
          name="ProgramFormModal"
          component={ProgramFormModal}
          options={({ route }) => ({
            title: route.params && route.params.programId ? 'Edit Program' : 'Add Program',
            presentation: 'modal'
          })}
        />
        <AppStack.Screen
          name="LoadFormModal"
          component={LoadFormModal}
          options={() => ({
            title: 'Select Load',
            presentation: 'modal'
          })}
        />
        <AppStack.Screen
          name="SessionSelectModal"
          component={SessionSelectModal}
          options={() => ({
            title: 'Select Template',
            presentation: 'modal'
          })}
        />
        <AppStack.Screen
          name="ExerciseFormModal"
          component={ExerciseFormModal}
          options={({ route }) => ({
            title: route.params && route.params.exerciseId ? 'Edit Exercise' : 'Add Exercise',
            presentation: 'modal'
          })}
        />
      </AppStack.Navigator>
    </NavigationContainer>
  )
}
