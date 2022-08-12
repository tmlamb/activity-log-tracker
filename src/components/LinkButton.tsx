import { NavigationAction, useLinkProps } from '@react-navigation/native'
import { To } from '@react-navigation/native/lib/typescript/src/useLinkTo'
import React from 'react'
import { AccessibilityValue } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'
import { RootStackParamList } from './Navigation'

type Props = {
  to: To<RootStackParamList>
  action?: NavigationAction
  children: JSX.Element | JSX.Element[]
  style?: ClassInput
  beforeNavigation?: () => void
  onPress?: () => void
  disabled?: boolean
  accessibilityHint?: string
  accessibilityLabel?: string
  accessibilityValue?: AccessibilityValue
}

export default function LinkButton({
  to,
  action,
  children,
  style,
  beforeNavigation,
  onPress,
  disabled,
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue
}: Props) {
  const { onPress: navigate } = useLinkProps<RootStackParamList>({ to, action })

  return (
    <ButtonContainer
      style={tw.style(style)}
      onPress={e => {
        onPress?.()
        if (disabled) {
          return
        }
        beforeNavigation?.()
        navigate(e)
      }}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      accessibilityValue={accessibilityValue}
    >
      {children}
    </ButtonContainer>
  )
}

LinkButton.defaultProps = {
  action: undefined,
  style: undefined,
  beforeNavigation: () => null,
  onPress: () => null,
  disabled: false,
  accessibilityHint: undefined,
  accessibilityLabel: undefined,
  accessibilityValue: undefined
}
