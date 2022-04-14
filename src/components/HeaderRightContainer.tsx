import { useNavigation } from '@react-navigation/native'
import React, { useLayoutEffect, useMemo } from 'react'
import { View } from 'react-native'
import { tw } from '../tailwind'

type Props = {
  children: React.ReactNode
}

export default function HeaderRightContainer({ children }: Props) {
  const memoizedComponent = useMemo(() => <View style={tw`web:mr-4`}>{children}</View>, [children])
  const navigation = useNavigation()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => memoizedComponent
    })
  }, [memoizedComponent, navigation])

  return null
}
