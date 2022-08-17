import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Platform, View } from 'react-native'
import { useAppColorScheme } from 'twrnc'
import tw from '../../tailwind'
import { primaryTextColor } from '../Themed'

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  // React Native Web / React Navigation have a bug with header back button tint on
  // dark mode, so forcing light mode for now
  const [, , setColorScheme] = useAppColorScheme(tw)
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      setColorScheme('light')
    }
  }, [setColorScheme])

  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-slate-50 dark:bg-black`,
      headerTitleStyle: tw.style(primaryTextColor),
      headerShadowVisible: false,
      headerTintColor: tw.style(primaryTextColor).color,
      headerBackTitleStyle: tw.style(primaryTextColor)
    })
  }, [navigation])

  return <View style={tw`flex-1 bg-slate-50 dark:bg-black`}>{children}</View>
}
