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
import Animated, { FadeInRight, FadeOutDown } from 'react-native-reanimated'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../../tailwind'
import { AlertText, primaryTextColor, SecondaryText, secondaryTextColor } from './ThemedText'
import ThemedView from './ThemedView'

type Props = {
  onChangeText?: (text: string) => void
  onChange?: (e: NativeSyntheticEvent<TextInputChangeEventData>) => void
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
  selection?: { start: number; end?: number }
  onKeyPress?: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void
  innerRef?: React.LegacyRef<NativeTextInput>
  error?: string
  errorStyle?: ClassInput
}

// TODO: fix issues with entering leading zeroes in various places

// Why is this necessary? Because when we right justify the text in
// our TextInput, any trailing whitespace in the field gets treated
// as space to be removed so that the text is right aligned. This
// causes our users spaces to be ignored visually until they enter
// a non-whitespace character. Luckily &nbsp; (\u00a0) does not
// behave this way.
const nbspReplace = (str: string) => str.replace(/\u0020/, '\u00a0')
// TODO: unify nbsp replacement here
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
  innerRef,
  error,
  errorStyle
}: PropsFilled) {
  const handleChange = (text: string) => {
    const normalizedText = nbspReplace(numeric ? numericReplace(text) : text)
    onChangeText(normalizedText)
  }

  return (
    <ThemedView style={tw.style('relative py-0', style)}>
      <ThemedView style={tw`px-0 py-2`}>
        {label && (
          <SecondaryText style={tw.style('absolute pl-0 web:relative', labelStyle)}>
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
            'w-full py-[2.65px] z-20 pr-0 text-lg leading-tight tracking-tight',
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
          returnKeyType="go"
          blurOnSubmit
        />
      </ThemedView>
      {error && (
        <Animated.View
          entering={FadeInRight.springify().stiffness(40).damping(6).mass(0.3)}
          exiting={FadeOutDown.springify().stiffness(40).damping(6).mass(0.3)}
          pointerEvents="none"
          style={tw.style(
            'absolute items-center justify-center h-full z-0 -top-[30px] right-3',
            errorStyle
          )}
        >
          <AlertText style={tw`text-xs`}>{error}</AlertText>
        </Animated.View>
      )}
    </ThemedView>
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
  innerRef: undefined,
  error: undefined,
  errorStyle: undefined
}
