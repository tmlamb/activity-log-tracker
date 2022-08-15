import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { View } from 'react-native'
import { useDeviceContext } from 'twrnc'
import { Navigation } from './src/components/Navigation'
import tw from './src/tailwind'

export default function App() {
  // https://github.com/jaredh159/tailwind-react-native-classnames#enabling-device-context-prefixes
  useDeviceContext(tw)

  return (
    <View style={tw`flex-1 web:flex-row web:justify-center web:bg-slate-500`}>
      <View style={tw`flex-1 web:max-w-xl bg-slate-50 dark:bg-black`}>
        <StatusBar />
        <Navigation />
      </View>
    </View>
  )
}
