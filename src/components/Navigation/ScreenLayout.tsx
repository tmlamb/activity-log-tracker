import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { View } from 'react-native'
import { tw } from '../../tailwind'
import { primaryTextColor } from '../Typography'

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <View style={tw`flex-row justify-center flex-grow bg-slate-50 dark:bg-black`}>
      <View style={tw`flex-grow max-w-2xl`}>{children}</View>
    </View>
  )
}
