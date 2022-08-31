import Constants from 'expo-constants'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Platform } from 'react-native'
import { enableLayoutAnimations } from 'react-native-reanimated'
import * as Sentry from 'sentry-expo'
import { useDeviceContext } from 'twrnc'
import { Navigation } from './src/components/Navigation'
import WebWrapper from './src/components/WebWrapper'
import useWorkoutStore from './src/hooks/use-workout-store'
import tw from './src/tailwind'

const { sentryPublicDsn, appEnv } = Constants.expoConfig?.extra || {}

if (sentryPublicDsn) {
  Sentry.init({
    dsn: sentryPublicDsn,
    enableInExpoDevelopment: true,
    debug: appEnv !== 'production'
  })
}

function App() {
  // https://github.com/jaredh159/tailwind-react-native-classnames#enabling-device-context-prefixes
  useDeviceContext(tw)

  // https://github.com/react-navigation/react-navigation/issues/10531
  // This fixes a layout issue on Android, where the content is hidden behind the header
  // Unfortunately it also disables all layout animations. Hopefully this will be fixed in
  // the react-native-reanimated package in the future.
  if (Platform.OS === 'android') {
    enableLayoutAnimations(false)
  }

  // Zustand will take care of triggering the re-render once the async hydration completes and
  // hasHydrated gets set to true. Without this, the app will attempt to render before the
  // hydration completes.
  const hasHydrated = useWorkoutStore(state => state.hasHydrated)
  if (!hasHydrated) {
    return null
  }

  return (
    <WebWrapper>
      <>
        <StatusBar />
        <Navigation />
      </>
    </WebWrapper>
  )
}

export default Sentry.Native.wrap(App)
