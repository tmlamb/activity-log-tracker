import React from 'react'
import { TextInput } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import { primaryTextColor } from './Typography'

type Props = {
  onChangeText: (text: string) => void
  onBlur: (e: unknown) => void
  value: string
  style?: ClassInput
  placeholder: string
  maxLength?: number
}

export default function SimpleTextInput({
  onChangeText,
  onBlur,
  value,
  style,
  placeholder,
  maxLength
}: Props) {
  return (
    <TextInput
      onChangeText={onChangeText}
      onBlur={onBlur}
      value={value}
      style={tw.style(
        primaryTextColor,
        'p-3 text-lg leading-tight tracking-wide bg-slate-200 dark:bg-slate-800 mb-9',
        style
      )}
      placeholder={placeholder}
      placeholderTextColor={tw.color('slate-400')}
      maxLength={maxLength}
    />
  )
}

SimpleTextInput.defaultProps = {
  style: undefined,
  maxLength: undefined
}
