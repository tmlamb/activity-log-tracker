import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable } from 'react-native'
import { ActivityNavigationProp } from './ActivityDetailScreen'
import { ProgramNavigationProp } from './ProgramDetailScreen'
import { SessionNavigationProp } from './SessionDetailScreen'

type Props = {
  children: React.ReactNode
  screen:
    | 'DashboardScreen'
    | 'ProgramDetailScreen'
    | 'ProgramFormModal'
    | 'SessionDetailScreen'
    | 'SessionFormModal'
    | 'ActivityDetailScreen'
    | 'ActivityFormModal'
  entityId?: string
}

export default function NavigationLink({ children, screen, entityId }: Props) {
  const navigation = useNavigation<
    ProgramNavigationProp | SessionNavigationProp | ActivityNavigationProp
  >()

  return (
    <Pressable
      onPress={() =>
        navigation.navigate(
          screen,
          entityId
            ? {
                entityId,
                name: ''
              }
            : undefined
        )
      }
    >
      {children}
    </Pressable>
  )
}

NavigationLink.defaultProps = {
  entityId: undefined
}
