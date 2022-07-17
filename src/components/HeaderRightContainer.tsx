import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { View } from 'react-native'
import tw from '../tailwind'

type Props = {
  children: React.ReactNode
}

export default function HeaderRightContainer({ children }: Props) {
  const memoizedComponent = React.useMemo(
    () => <View style={tw`web:mr-3`}>{children}</View>,
    [children]
  )
  const navigation = useNavigation()

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => memoizedComponent
    })
  }, [memoizedComponent, navigation])

  return null
}
