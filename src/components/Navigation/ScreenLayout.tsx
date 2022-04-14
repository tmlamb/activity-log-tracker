import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'
import { View } from 'react-native'
import { tw } from '../../tailwind'
import { primaryTextColor } from '../Typography'

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()
  useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-slate-50 dark:bg-black`,
      headerTitleStyle: tw.style(primaryTextColor),
      headerShadowVisible: false,
      headerTintColor: tw.style(primaryTextColor).color
    })
  }, [navigation])

  return <View style={tw`w-full h-full p-4 bg-slate-50 dark:bg-black`}>{children}</View>
}
