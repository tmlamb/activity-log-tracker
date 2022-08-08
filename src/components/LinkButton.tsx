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
  children: JSX.Element | JSX.Element[]
  style?: ClassInput
  beforeNavigation?: () => void
  onPress?: () => void
  disabled?: boolean
}

export default function LinkButton({
  to,
  action,
  children,
  style,
  beforeNavigation,
  onPress,
  disabled
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
  disabled: false
}
