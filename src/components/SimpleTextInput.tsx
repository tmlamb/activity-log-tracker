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
    <Card style={tw.style('flex flex-row items-center justify-between relative px-2', style)}>
      {label && (
        <SecondaryText style={tw`absolute pl-2 web:pl-0 web:relative`}>{label}</SecondaryText>
      )}
      <TextInput
        onChangeText={handleChange}
        onBlur={onBlur}
        value={value}
        style={tw.style(
          primaryTextColor,
          'py-3 px-4 w-full web:w-auto text-lg leading-tight tracking-wide',
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
  maxLength: undefined,
  label: undefined,
  placeholder: undefined,
  textAlign: 'left',
  selectTextOnFocus: false,
  clearTextOnFocus: false,
  numeric: false,
  keyboardType: 'default'
}
