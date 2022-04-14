import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable } from 'react-native'
import { ActivityNavigationProp } from './ActivityDetailScreen'
import { ProgramNavigationProp } from './ProgramDetailScreen'
import { ProgramFormNavigationProp } from './ProgramFormModal'
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
  name?: string
}

export default function NavigationLink({ children, screen, entityId, name }: Props) {
  const navigation = useNavigation<
    | ProgramNavigationProp
    | SessionNavigationProp
    | ActivityNavigationProp
    | ProgramFormNavigationProp
  >()

  return (
    <Pressable
      onPress={() =>
        // navigation.navigate(
        //   screen,
        //   entityId
        //     ? {
        //         entityId,
        //         name: name || '',
        //       }
        //     : undefined
        // )
        navigation.navigate(screen, {
          entityId: entityId || '',
          name: name || ''
        })
      }
    >
      {children}
    </Pressable>
  )
}

NavigationLink.defaultProps = {
  entityId: undefined,
  name: undefined
}
