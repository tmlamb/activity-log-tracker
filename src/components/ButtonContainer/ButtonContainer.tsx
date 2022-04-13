import React from 'react'
import { GestureResponderEvent, Pressable } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'

export default function ButtonContainer({
  children,
  style,
  onPress
}: {
  children: React.ReactNode
  onPress: (event: GestureResponderEvent) => void | null | undefined
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
