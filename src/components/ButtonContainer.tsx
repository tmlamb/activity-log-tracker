import React from 'react'
import { NativeSyntheticEvent, NativeTouchEvent, Pressable } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'

export default function ButtonContainer({
  children,
  style,
  onPress,
  disabled
}: {
  children: React.ReactNode
  onPress: (ev: NativeSyntheticEvent<NativeTouchEvent>) => void
  style?: ClassInput
  disabled?: boolean
}) {
  return (
    <Pressable style={tw.style(style)} disabled={disabled} onPress={onPress}>
      {children}
    </Pressable>
  )
}

ButtonContainer.defaultProps = {
  style: undefined,
  disabled: false
}
