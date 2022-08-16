import { useHeaderHeight } from '@react-navigation/elements'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Platform, View } from 'react-native'
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

  const headerHeight = useHeaderHeight()

  return (
    <View
      style={tw.style(
        'flex-1 px-3 bg-slate-50 dark:bg-black',
        `mt-[${Platform.OS === 'android' ? headerHeight : 0}px]`
      )}
    >
      {children}
    </View>
  )
}
