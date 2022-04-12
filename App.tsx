import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { useDeviceContext } from 'twrnc'
import { Navigation } from './src/components/Navigation'
import { ProgramProvider } from './src/context/ProgramState'
import { tw } from './src/tailwind'

export default function App() {
  // https://github.com/jaredh159/tailwind-react-native-classnames#enabling-device-context-prefixes
  useDeviceContext(tw)

  return (
    <>
      <StatusBar />
      <ProgramProvider>
        <Navigation />
      </ProgramProvider>
      <StatusBar />
    </>
  )
}
