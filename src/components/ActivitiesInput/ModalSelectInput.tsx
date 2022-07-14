import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import { ModalSelectParams } from '../../types'
import ButtonContainer from '../ButtonContainer'
import CardInfo from '../CardInfo'
import { SecondaryText } from '../Typography'

type Props<T> = {
  label?: string
  value?: T
  stringify?: (value: T) => string
  style?: ClassInput
  onChangeSelect: (value: T) => void
  placeholder?: string
  textStyle?: ClassInput
  modalParams?: { [key: string]: string | undefined }
  modalScreen: string
}

export default function ModalSelectInput<T>({
  label,
  value,
  style,
  onChangeSelect,
  placeholder,
  stringify,
  textStyle,
  modalParams,
  modalScreen
}: Props<T>) {
  const navigation = useNavigation<ModalSelectParams<T>>()

  return (
    <ButtonContainer
      style={tw``}
      onPress={() => navigation.navigate(modalScreen, { value, onChangeSelect, ...modalParams })}
    >
      <CardInfo
        style={tw.style(style)}
        textStyle={tw.style(textStyle)}
        primaryText={label}
        secondaryText={(!placeholder && value && stringify && stringify(value)) as string}
        specialText={
          (!value ? placeholder : undefined) ||
          (value && placeholder && stringify && stringify(value))
        }
        rightIcon={
          <SecondaryText style={tw`mt-0.5`}>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        }
        reverse={placeholder ? true : undefined}
      />
    </ButtonContainer>
  )
}

ModalSelectInput.defaultProps = {
  label: undefined,
  value: undefined,
  style: undefined,
  stringify: undefined,
  textStyle: undefined,
  placeholder: undefined,
  modalParams: undefined
}
