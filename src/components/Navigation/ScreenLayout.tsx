import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'
import { View } from 'react-native'
import { tw } from '../../tailwind'
import { primaryTextStyle } from '../Typography'

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()
  useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-slate-100 dark:bg-black`,
      headerTitleStyle: primaryTextStyle(),
      headerShadowVisible: false,
      headerTintColor: primaryTextStyle().color
    })
  }, [navigation])

  return <View style={tw`w-full h-full p-4 bg-slate-100 dark:bg-black`}>{children}</View>
}
