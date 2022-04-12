import React from 'react'
import { Text, View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { ButtonContainer } from '../ButtonContainer'
import { PrimaryText } from '../Typography'

type Props = {
  name: string
  onChangeOption: (option: unknown) => void
  options: unknown[]
  onBlur: (e: unknown) => void
  value: unknown
  style?: ClassInput
  defaultValue: unknown
  disabled?: boolean
}

export default function SimpleSelectInput({
  name,
  onChangeOption,
  options,
  onBlur,
  value,
  style,
  defaultValue,
  disabled
}: Props) {
  return (
    <View>
      <PrimaryText>name</PrimaryText>
      <Text>value</Text>
      <ButtonContainer onPress={() => null}>openmodal</ButtonContainer>
    </View>
    // <TextInput
    //   onChangeText={onChangeText}
    //   onBlur={onBlur}
    //   value={value}
    //   style={tw.style(
    //     primaryTextStyle(),
    //     'p-3 text-lg leading-tight bg-slate-400 dark:bg-slate-700 mb-3',
    //     style
    //   )}
    //   placeholder={placeholder}
    // />
  )
}

SimpleSelectInput.defaultProps = {
  style: undefined,
  disabled: false
}
