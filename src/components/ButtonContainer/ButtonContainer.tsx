import React from 'react'
import { GestureResponderEvent, Pressable } from 'react-native'

export default function ButtonContainer({
  children,
  onPress
}: {
  children: React.ReactNode
  onPress: (event: GestureResponderEvent) => void | null | undefined
}) {
  return <Pressable onPress={onPress}>{children}</Pressable>
}
