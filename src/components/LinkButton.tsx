import { NavigationAction, useLinkProps } from '@react-navigation/native'
import { To } from '@react-navigation/native/lib/typescript/src/useLinkTo'
import React from 'react'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'
import { RootStackParamList } from './Navigation'

type Props = {
  to: To<RootStackParamList>
  action?: NavigationAction
  children: JSX.Element
  style?: ClassInput
  beforeNavigation?: () => void
  disabled?: boolean
}

export default function LinkButton({
  to,
  action,
  children,
  style,
  beforeNavigation,
  disabled
}: Props) {
  const { onPress } = useLinkProps<RootStackParamList>({ to, action })

  return (
    <ButtonContainer
      style={tw.style(style)}
      onPress={e => {
        beforeNavigation?.()
        onPress(e)
      }}
      disabled={disabled}
    >
      {children}
    </ButtonContainer>
  )
}

LinkButton.defaultProps = {
  action: undefined,
  style: undefined,
  beforeNavigation: () => null,
  disabled: false
}
