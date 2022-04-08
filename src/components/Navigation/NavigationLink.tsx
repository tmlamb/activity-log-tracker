import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable } from 'react-native'
import { ActivityNavigationProp } from './ActivityDetailScreen'
import { ProgramNavigationProp } from './ProgramDetailScreen'
import { SessionNavigationProp } from './SessionDetailScreen'

export default function AppLink({
  children,
  id,
  screen
}: {
  children: React.ReactNode
  id: string | undefined
  screen:
    | 'DashboardScreen'
    | 'ProgramDetailScreen'
    | 'ProgramFormModal'
    | 'SessionDetailScreen'
    | 'SessionFormModal'
    | 'ActivityDetailScreen'
    | 'ActivityFormModal'
}) {
  const navigation = useNavigation<
    ProgramNavigationProp | SessionNavigationProp | ActivityNavigationProp
  >()

  return (
    <Pressable
      onPress={() =>
        navigation.navigate(screen, {
          id: id || ''
        })
      }
    >
      {children}
    </Pressable>
  )
}
