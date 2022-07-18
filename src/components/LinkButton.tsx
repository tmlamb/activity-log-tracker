import { NavigationAction, useLinkProps } from '@react-navigation/native'
import { To } from '@react-navigation/native/lib/typescript/src/useLinkTo'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import { RootStackParamList } from './Navigation'

type Props = {
  to: To<RootStackParamList>
  action?: NavigationAction
  children: JSX.Element
  style?: ClassInput
  beforeNavigation?: () => void
}

export default function LinkButton({ to, action, children, style, beforeNavigation }: Props) {
  const { onPress, accessibilityRole } = useLinkProps<RootStackParamList>({ to, action })

  return (
    <TouchableOpacity
      style={tw.style(style)}
      onPress={e => {
        beforeNavigation?.()
        return onPress(e)
      }}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </TouchableOpacity>
  )
}

LinkButton.defaultProps = {
  action: undefined,
  style: undefined,
  beforeNavigation: () => null
}
