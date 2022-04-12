import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'
import { View } from 'react-native'
import { tw } from '../../tailwind'
import { primaryTextStyle } from '../Typography'

export default function ModalLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-white dark:bg-slate-800`,
      headerTitleStyle: primaryTextStyle(),
      headerShadowVisible: false,
      headerTintColor: primaryTextStyle().color
    })
  }, [navigation])

  return <View style={tw`w-full h-full py-6 bg-white dark:bg-slate-800`}>{children}</View>
}
