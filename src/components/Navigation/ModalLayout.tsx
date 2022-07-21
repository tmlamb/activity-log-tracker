import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { View } from 'react-native'
import tw from '../../tailwind'
import { primaryTextColor } from '../Typography'

export default function ModalLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-white dark:bg-slate-900`,
      headerTitleStyle: tw.style(primaryTextColor),
      headerShadowVisible: false,
      headerTintColor: tw.style(primaryTextColor).color
    })
  }, [navigation])

  return (
    <View style={tw`flex-row justify-center flex-1 bg-white dark:bg-slate-900`}>
      <View style={tw`flex-1 max-w-2xl android:mt-20`}>{children}</View>
    </View>
  )
}
