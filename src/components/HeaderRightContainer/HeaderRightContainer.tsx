import { useNavigation } from '@react-navigation/native'
import React, { useLayoutEffect, useMemo } from 'react'

type Props = {
  children: React.ReactNode
}

export default function HeaderRightContainer({ children }: Props) {
  const memoizedComponent = useMemo(() => children, [children])
  const navigation = useNavigation()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => memoizedComponent
    })
  }, [memoizedComponent, navigation])

  return null
}
