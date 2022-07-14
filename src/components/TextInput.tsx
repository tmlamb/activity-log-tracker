import React from 'react'
import {
  ColorValue,
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
  onBlur?: (e: unknown) => void
  value?: string
  style?: ViewStyle
  textInputStyle?: ClassInput
  labelStyle?: ClassInput
  label?: string
  placeholder?: string
  placeholderTextColor?: ColorValue
  maxLength?: number
  selectTextOnFocus?: boolean
  clearTextOnFocus?: boolean
  keyboardType?: KeyboardTypeOptions
  numeric?: boolean
  editable?: boolean
  selection?: { start: number; end?: number } | undefined
  onKeyPress?: ((e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void) | undefined
  innerRef?: React.LegacyRef<NativeTextInput> | undefined
}

// Why is this necessary? Because when we right justify the text in
// our TextInput, any trailing whitespace in the field gets treated
// as space to be removed so that the text is right aligned. This
// causes our users spaces to be ignored visually until they enter
// a non-whitespace character. Luckily &nbsp; (\u00a0) does not
// behave this way.
const nbspReplace = (str: string) => str.replace(/\u0020/, '\u00a0')

const numericReplace = (str: string) => str.replace(/[^0-9|\\.]/g, '')

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
  placeholderTextColor,
  maxLength,
  selectTextOnFocus,
  clearTextOnFocus,
  keyboardType,
  numeric,
  editable,
  selection,
  onKeyPress,
  innerRef
}: PropsFilled) {
  const handleChange = (text: string) => {
    const normalizedText = nbspReplace(numeric ? numericReplace(text) : text)
    onChangeText(normalizedText)
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
          'py-2.5 px-3 w-full web:w-2/5 text-lg leading-tight tracking-wide',
          textInputStyle
        )}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || tw.color(secondaryTextColor)}
        maxLength={maxLength}
        keyboardType={keyboardType}
        textAlign={label ? 'right' : undefined}
        textAlignVertical="top"
        selectTextOnFocus={selectTextOnFocus}
        clearTextOnFocus={clearTextOnFocus}
        editable={editable}
        selection={selection}
        onKeyPress={onKeyPress}
        multiline
        numberOfLines={1}
        scrollEnabled={false}
        ref={innerRef}
      />
    </Card>
  )
}

TextInput.defaultProps = {
  value: undefined,
  style: undefined,
  onChangeText: (text: string) => text,
  onChange: undefined,
  onBlur: undefined,
  textInputStyle: undefined,
  labelStyle: undefined,
  maxLength: undefined,
  label: undefined,
  placeholder: undefined,
  placeholderTextColor: undefined,
  selectTextOnFocus: false,
  clearTextOnFocus: false,
  numeric: false,
  keyboardType: 'default',
  editable: true,
  selection: undefined,
  onKeyPress: undefined,
  innerRef: undefined
}
