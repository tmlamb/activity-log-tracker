import React from 'react'
import { KeyboardTypeOptions, TextInput, ViewStyle } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import Card from './Card'
import { primaryTextColor, SecondaryText, secondaryTextColor } from './Typography'

type Props = {
  onChangeText?: (text: string) => void
  onBlur: (e: unknown) => void
  value?: string
  style?: ViewStyle
  textInputStyle?: ClassInput
  labelStyle?: ClassInput
  label?: string
  placeholder?: string
  maxLength?: number
  textAlign?: 'left' | 'right' | 'center'
  selectTextOnFocus?: boolean
  clearTextOnFocus?: boolean
  keyboardType?: KeyboardTypeOptions
  numeric?: boolean
}

interface PropsFilled extends Props {
  onChangeText: (text: string) => void
  keyboardType: KeyboardTypeOptions
}

export default function SimpleTextInput({
  onChangeText,
  onBlur,
  value,
  style,
  textInputStyle,
  labelStyle,
  label,
  placeholder,
  maxLength,
  textAlign,
  selectTextOnFocus,
  clearTextOnFocus,
  keyboardType,
  numeric
}: PropsFilled) {
  const handleChange = (text: string) => {
    onChangeText(numeric ? text.replace(/[^0-9|\\.]/g, '') : text)
  }

  return (
    <Card style={tw.style('flex flex-row items-center justify-between relative', style)}>
      {label && (
        <SecondaryText style={tw.style('absolute pl-4 web:w-2/3 web:relative', labelStyle)}>
          {label}
        </SecondaryText>
      )}
      <TextInput
        onChangeText={handleChange}
        onBlur={onBlur}
        value={value}
        style={tw.style(
          primaryTextColor,
          'py-3 px-4 w-full web:w-1/3 text-lg leading-tight tracking-wide',
          textInputStyle
        )}
        placeholder={placeholder}
        placeholderTextColor={tw.color(secondaryTextColor)}
        maxLength={maxLength}
        keyboardType={keyboardType}
        textAlign={textAlign}
        selectTextOnFocus={selectTextOnFocus}
        clearTextOnFocus={clearTextOnFocus}
      />
    </Card>
  )
}

SimpleTextInput.defaultProps = {
  value: undefined,
  style: undefined,
  onChangeText: (text: string) => text,
  textInputStyle: undefined,
  labelStyle: undefined,
  maxLength: undefined,
  label: undefined,
  placeholder: undefined,
  textAlign: 'left',
  selectTextOnFocus: false,
  clearTextOnFocus: false,
  numeric: false,
  keyboardType: 'default'
}
