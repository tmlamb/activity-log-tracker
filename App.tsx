import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Platform, View } from 'react-native'
import { enableLayoutAnimations } from 'react-native-reanimated'
import { useDeviceContext } from 'twrnc'
import { Navigation } from './src/components/Navigation'
import tw from './src/tailwind'

export default function App() {
  // https://github.com/jaredh159/tailwind-react-native-classnames#enabling-device-context-prefixes
  useDeviceContext(tw)

  // https://github.com/react-navigation/react-navigation/issues/10531
  // This fixes a layout issue on Android, where the content is hidden behind the header
  if (Platform.OS === 'android') {
    enableLayoutAnimations(false)
  }
  console.log('site hit')
  return (
    <View style={tw`flex-1 web:flex-row web:justify-center web:bg-slate-500`}>
      <View style={tw`flex-1 web:max-w-2xl bg-slate-50 dark:bg-black`}>
        <StatusBar />
        <Navigation />
      </View>
    </View>
  )
}
