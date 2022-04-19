import React from 'react'
import { NativeSyntheticEvent, NativeTouchEvent, Pressable } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'

export default function ButtonContainer({
  children,
  style,
  onPress
}: {
  children: React.ReactNode
  onPress: (ev: NativeSyntheticEvent<NativeTouchEvent>) => void
  style?: ClassInput
}) {
  return (
    <Pressable style={tw.style(style)} onPress={onPress}>
      {children}
    </Pressable>
  )
}

ButtonContainer.defaultProps = {
  style: undefined
}
