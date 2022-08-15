import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Platform, StatusBar, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
    <View
      style={tw.style(
        'flex-1 bg-slate-50 dark:bg-black justify-between',
        `pt-[${
          Platform.OS === 'android' ? Number(StatusBar.currentHeight) + insets.top + 24 : 0
        }px]`
      )}
    >
      {children}
    </View>
  )
}
