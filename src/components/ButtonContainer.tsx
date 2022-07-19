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
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => tw.style(style, pressed ? 'opacity-60' : 'opacity-100')}
    >
      {children}
    </Pressable>
  )
}

ButtonContainer.defaultProps = {
  style: undefined,
  disabled: false
}
