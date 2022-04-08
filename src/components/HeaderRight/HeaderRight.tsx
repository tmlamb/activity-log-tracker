import { useNavigation } from '@react-navigation/native'
import React, { useLayoutEffect, useMemo } from 'react'
import { Button } from 'react-native'

export default function HeaderRight({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()

  const memoizedComponent = useMemo(() => children, [children])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => memoizedComponent,
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => <Button title="Done" onPress={() => null} />
    })
  })
  return null
}
