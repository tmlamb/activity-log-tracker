import React from 'react'
import {
  KeyboardTypeOptions,
  NativeSyntheticEvent,
  TextInput as NativeTextInput,
  TextInputChangeEventData,
  TextInputKeyPressEventData,
  ViewStyle
} from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import Card from './Card'
import { primaryTextColor, SecondaryText, secondaryTextColor } from './Typography'

type Props = {
  onChangeText?: (text: string) => void
  onChange?: ((e: NativeSyntheticEvent<TextInputChangeEventData>) => void) | undefined
  onBlur: (e: unknown) => void
  value?: string
  style?: ViewStyle
  textInputStyle?: ClassInput
  labelStyle?: ClassInput
  label?: string
  placeholder?: string
  maxLength?: number
  selectTextOnFocus?: boolean
  clearTextOnFocus?: boolean
  keyboardType?: KeyboardTypeOptions
  numeric?: boolean
  editable?: boolean
  selection?: { start: number; end?: number } | undefined
  onKeyPress?: ((e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void) | undefined
}

interface PropsFilled extends Props {
  onChangeText: (text: string) => void
  keyboardType: KeyboardTypeOptions
}

export default function TextInput({
  onChangeText,
  onChange,
  onBlur,
  value,
  style,
  textInputStyle,
  labelStyle,
  label,
  placeholder,
  maxLength,
  selectTextOnFocus,
  clearTextOnFocus,
  keyboardType,
  numeric,
  editable,
  selection,
  onKeyPress
}: PropsFilled) {
  const handleChange = (text: string) => {
    onChangeText(numeric ? text.replace(/[^0-9|\\.]/g, '') : text)
  }

  return (
    <Card style={tw.style('flex-row items-center justify-between relative', style)}>
      {label && (
        <SecondaryText style={tw.style('absolute pl-3 web:w-4/5 web:relative', labelStyle)}>
          {label}
        </SecondaryText>
      )}
      <NativeTextInput
        onChangeText={handleChange}
        onChange={onChange}
        onBlur={onBlur}
        value={value}
        style={tw.style(
          primaryTextColor,
          'py-3 px-3 w-full web:w-1/5 text-lg leading-tight tracking-wide',
          textInputStyle
        )}
        placeholder={placeholder}
        placeholderTextColor={tw.color(secondaryTextColor)}
        maxLength={maxLength}
        keyboardType={keyboardType}
        textAlign={label ? 'right' : undefined}
        selectTextOnFocus={selectTextOnFocus}
        clearTextOnFocus={clearTextOnFocus}
        editable={editable}
        selection={selection}
        onKeyPress={onKeyPress}
        multiline
      />
    </Card>
  )
}

TextInput.defaultProps = {
  value: undefined,
  style: undefined,
  onChangeText: (text: string) => text,
  onChange: undefined,
  textInputStyle: undefined,
  labelStyle: undefined,
  maxLength: undefined,
  label: undefined,
  placeholder: undefined,
  selectTextOnFocus: false,
  clearTextOnFocus: false,
  numeric: false,
  keyboardType: 'default',
  editable: true,
  selection: undefined,
  onKeyPress: undefined
}
