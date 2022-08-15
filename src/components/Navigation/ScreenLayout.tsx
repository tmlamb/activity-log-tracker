import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Platform, StatusBar } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
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

  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView
      style={tw.style(
        'flex-1 bg-slate-50 dark:bg-black',
        `pt-[${
          Platform.OS === 'android' ? Number(StatusBar.currentHeight) + insets.top + 24 : 0
        }px]`
      )}
      edges={Platform.OS === 'android' ? ['left', 'right'] : ['left', 'right']}
    >
      {children}
    </SafeAreaView>
  )
}
