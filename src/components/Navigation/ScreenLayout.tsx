import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'
import { ScrollView } from 'react-native'
import { tw } from '../../tailwind'
import { primaryTextColor } from '../Typography'

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()
  useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-slate-100 dark:bg-black`,
      headerTitleStyle: tw.style(primaryTextColor),
      headerShadowVisible: false,
      headerTintColor: tw.style(primaryTextColor).color
    })
  }, [navigation])

  return (
    <ScrollView style={tw`w-full h-full p-3 bg-slate-100 dark:bg-black`}>{children}</ScrollView>
  )
}
