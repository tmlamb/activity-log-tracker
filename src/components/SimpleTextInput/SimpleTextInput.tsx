import React from 'react'
import { TextInput } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import { primaryTextStyle } from '../Typography'

type Props = {
  onChangeText: (text: string) => void
  onBlur: (e: unknown) => void
  value: string
  style?: ClassInput
  placeholder: string
}

export default function SimpleTextInput({
  onChangeText,
  onBlur,
  value,
  style,
  placeholder
}: Props) {
  return (
    <TextInput
      onChangeText={onChangeText}
      onBlur={onBlur}
      value={value}
      style={tw.style(
        primaryTextStyle(),
        'p-3 text-lg leading-tight bg-slate-400 dark:bg-slate-700 mb-3',
        style
      )}
      placeholder={placeholder}
      //   textAlignVertical="center"
    />
  )
}

SimpleTextInput.defaultProps = {
  style: undefined
}
