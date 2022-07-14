import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { LogBox } from 'react-native'
import { useDeviceContext } from 'twrnc'
import { Navigation } from './src/components/Navigation'
import { tw } from './src/tailwind'

// TODO: Address problem with non-serializable navigation prop (see onSelect function), then remove this ignore statement
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state'])

export default function App() {
  // https://github.com/jaredh159/tailwind-react-native-classnames#enabling-device-context-prefixes
  useDeviceContext(tw)

  return (
    <>
      <StatusBar />
      <Navigation />
    </>
  )
}
