import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Platform, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import tw from '../../tailwind'
import { primaryTextColor } from '../Themed'

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
    <SafeAreaView
      style={tw`flex-1 bg-slate-50 dark:bg-black`}
      edges={Platform.OS === 'android' ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      <View style={tw`flex-1 max-w-2xl`}>{children}</View>
    </SafeAreaView>
  )
}
