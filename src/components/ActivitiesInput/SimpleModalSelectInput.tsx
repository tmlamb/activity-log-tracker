import { AntDesign } from '@expo/vector-icons'
import React from 'react'
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
import CardInfo from '../CardInfo'
import NavigationLink from '../Navigation/NavigationLink'
import { SecondaryText } from '../Typography'

type Props<T> = {
  label: string
  value?: T
  stringify?: (value: T) => string
  style?: ClassInput
  screen:
    | 'DashboardScreen'
    | 'ProgramDetailScreen'
    | 'ProgramFormModal'
    | 'SessionDetailScreen'
    | 'SessionFormModal'
    | 'ActivityDetailScreen'
    | 'ActivityFormModal'
    | 'LoadFormModal'

  navigationParams:
    | ProgramNavParams
    | SessionNavParams
    | ActivityNavParams
    | LoadFormNavParams
    | ActivityFormNavParams
    | ProgramFormNavParams
    | SessionFormNavParams
    | undefined
}

interface PropsFilled<T> extends Props<T> {
  stringify: (value: T) => string
}

export default function SimpleModalSelectInput<T>({
  label,
  value,
  style,
  screen,
  navigationParams,
  stringify
}: PropsFilled<T>) {
  return (
    <NavigationLink screen={screen} navigationParams={navigationParams}>
      <CardInfo
        style={tw.style(style)}
        primaryText={label}
        secondaryText={value && stringify(value)}
        rightIcon={
          <SecondaryText>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        }
      />
    </NavigationLink>
  )
}

SimpleModalSelectInput.defaultProps = {
  value: undefined,
  style: undefined,
  stringify: (value: unknown) => value as string
}
