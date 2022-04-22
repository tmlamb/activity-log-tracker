import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import {
  ActivityFormNavParams,
  ActivityNavParams,
  ExerciseSelectNavParams,
  LoadFormNavParams,
  ProgramFormNavParams,
  ProgramNavParams,
  SessionFormNavParams,
  SessionNavParams,
  WorkoutSetNavParams
} from '../../types'
import { ActivityNavigationProp } from './ActivityDetailScreen'
import { ExerciseSelectNavigationProp } from './ExerciseSelectModal'
import { LoadFormNavigationProp } from './LoadFormModal'
import { ProgramNavigationProp } from './ProgramDetailScreen'
import { ProgramFormNavigationProp } from './ProgramFormModal'
import { SessionNavigationProp } from './SessionDetailScreen'
import { SessionFormNavigationProp } from './SessionFormModal'
import { WorkoutSetNavigationProp } from './WorkoutSetDetailScreen'

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
    | 'ExerciseSelectModal'
    | 'WorkoutSetDetailScreen'
  navigationParams?:
    | ProgramNavParams
    | SessionNavParams
    | ActivityNavParams
    | LoadFormNavParams
    | ActivityFormNavParams
    | ProgramFormNavParams
    | SessionFormNavParams
    | ExerciseSelectNavParams
    | WorkoutSetNavParams
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
    | ExerciseSelectNavigationProp
    | WorkoutSetNavigationProp
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
