import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Navigation } from './src/components/Navigation'
import { ProgramProvider } from './src/context/ProgramState'

export default function App() {
  return (
    <>
      <ProgramProvider>
        <Navigation />
      </ProgramProvider>
      <StatusBar />
    </>
  )
}
