import { useHeaderHeight } from '@react-navigation/elements'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Platform, View } from 'react-native'
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

  const headerHeight = useHeaderHeight()

  return (
    <View
      style={tw.style(
        'flex-1 bg-white dark:bg-slate-900',
        `mt-[${Platform.OS === 'android' ? headerHeight + 28 : 0}px]`
      )}
    >
      {children}
    </View>
  )
}
