import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'
import { View } from 'react-native'
import { tw } from '../../tailwind'
import { primaryTextColor } from '../Typography'

export default function ModalLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-white dark:bg-slate-900`,
      headerTitleStyle: tw.style(primaryTextColor),
      headerShadowVisible: false,
      headerTintColor: tw.style(primaryTextColor).color
    })
  }, [navigation])

  return (
    <View style={tw`w-full h-full bg-white py-9 dark:bg-slate-900`}>
      <View style={tw`w-full max-w-2xl px-0 mx-auto`}>{children}</View>
      {/* <View style={tw`w-full h-full max-w-2xl mx-auto bg-white py-9 dark:bg-slate-900`}> */}
      {/* {children} */}
    </View>
  )
}
