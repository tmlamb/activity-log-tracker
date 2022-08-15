import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Platform, StatusBar, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import tw from '../../tailwind'
import { primaryTextColor } from '../Themed'

export default function ModalLayout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()

  React.useEffect(() => {
    navigation.setOptions({
      headerStyle: tw`bg-white dark:bg-slate-900`,
      headerTitleStyle: tw.style(primaryTextColor),
      headerShadowVisible: false,
      headerTintColor: tw.style(primaryTextColor).color,
      headerBackTitleStyle: tw.style(primaryTextColor)
    })
  }, [navigation])

  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView
      style={tw.style(
        'flex-row justify-center flex-1 bg-white dark:bg-slate-900',
        `pt-[${Platform.OS === 'android' ? Number(StatusBar.currentHeight) + insets.top : 0}px]`
      )}
      edges={Platform.OS === 'android' ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      <View style={tw`flex-1 max-w-2xl`}>{children}</View>
    </SafeAreaView>
  )
}
