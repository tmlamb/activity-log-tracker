import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import {
  ActivityFormNavParams,
  ActivityNavParams,
  LoadFormNavParams,
  ProgramFormNavParams,
  ProgramNavParams,
  SessionFormNavParams,
  SessionNavParams
} from '../../types'
import { ActivityNavigationProp } from './ActivityDetailScreen'
import { LoadFormNavigationProp } from './LoadFormModal'
import { ProgramNavigationProp } from './ProgramDetailScreen'
import { ProgramFormNavigationProp } from './ProgramFormModal'
import { SessionNavigationProp } from './SessionDetailScreen'
import { SessionFormNavigationProp } from './SessionFormModal'

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
    | 'LoadFormModal'
  navigationParams?:
    | ProgramNavParams
    | SessionNavParams
    | ActivityNavParams
    | LoadFormNavParams
    | ActivityFormNavParams
    | ProgramFormNavParams
    | SessionFormNavParams
    | undefined
  callback?: () => void
  style?: ClassInput
}

interface PropsFilled extends Props {
  callback: () => void
}

export default function NavigationLink({
  children,
  screen,
  navigationParams,
  callback,
  style
}: PropsFilled) {
  const navigation = useNavigation<
    | ProgramNavigationProp
    | SessionNavigationProp
    | ActivityNavigationProp
    | ProgramFormNavigationProp
    | SessionFormNavigationProp
    | LoadFormNavigationProp
  >()

  return (
    <Pressable
      onPress={() => {
        callback()
        return navigation.navigate(screen, navigationParams)
      }}
      style={tw.style(style)}
    >
      {children}
    </Pressable>
  )
}

NavigationLink.defaultProps = {
  navigationParams: undefined,
  callback: () => null,
  style: undefined
}
