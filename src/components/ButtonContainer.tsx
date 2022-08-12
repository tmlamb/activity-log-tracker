import React from 'react'
import {
  AccessibilityRole,
  AccessibilityState,
  AccessibilityValue,
  NativeSyntheticEvent,
  NativeTouchEvent,
  Pressable
} from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'

export default function ButtonContainer({
  children,
  style,
  onPress,
  disabled,
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  accessibilityValue
}: {
  children: React.ReactNode
  onPress: (ev: NativeSyntheticEvent<NativeTouchEvent>) => void
  style?: ClassInput
  disabled?: boolean
  accessibilityHint?: string
  accessibilityLabel?: string
  accessibilityRole?: AccessibilityRole
  accessibilityState?: AccessibilityState
  accessibilityValue?: AccessibilityValue
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => tw.style(style, pressed ? 'opacity-60' : 'opacity-100')}
      accessibilityRole={accessibilityRole}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState || { disabled }}
      accessibilityValue={accessibilityValue}
    >
      {children}
    </Pressable>
  )
}

ButtonContainer.defaultProps = {
  style: undefined,
  disabled: false,
  accessibilityHint: undefined,
  accessibilityLabel: undefined,
  accessibilityRole: 'button',
  accessibilityState: undefined,
  accessibilityValue: undefined
}
