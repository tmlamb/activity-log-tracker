import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'
import { ScrollView } from 'react-native'
import { tw } from '../../tailwind'
import { primaryTextColor } from '../Typography'

export default function ModalLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-white dark:bg-slate-800`,
      headerTitleStyle: tw.style(primaryTextColor),
      headerShadowVisible: false,
      headerTintColor: tw.style(primaryTextColor).color
    })
  }, [navigation])

  return (
    <ScrollView style={tw`w-full h-full bg-white py-9 dark:bg-slate-800`}>{children}</ScrollView>
  )
}
