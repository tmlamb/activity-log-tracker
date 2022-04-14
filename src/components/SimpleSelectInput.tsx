import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import { BaseEntity } from '../types'
import ButtonContainer from './ButtonContainer'
import { PrimaryText, SecondaryText } from './Typography'

type Props = {
  onChangeOption: (e: string | React.ChangeEvent<unknown>) => void
  onBlur: (e: string | React.ChangeEvent<unknown>) => void
  label: string
  options: BaseEntity[]
  style?: ClassInput
  value?: BaseEntity
  disabled?: boolean
}

interface PropsFilled extends Props {
  value: BaseEntity
}

export default function SimpleSelectInput({
  onChangeOption,
  label,
  options,
  onBlur,
  style,
  value,
  disabled
}: PropsFilled) {
  return (
    <View
      style={tw.style(
        'flex flex-row items-center justify-between p-3 mb-9 bg-slate-200 dark:bg-slate-800',
        style
      )}
    >
      <PrimaryText style={tw`text-lg leading-tight`}>{label}</PrimaryText>
      <View>
        {value && <SecondaryText style={tw`text-lg leading-tight`}>{value.name}</SecondaryText>}
        {!disabled && (
          <ButtonContainer style={tw``} onPress={() => null}>
            TBD
          </ButtonContainer>
        )}
      </View>
    </View>
  )
}

SimpleSelectInput.defaultProps = {
  style: undefined,
  disabled: false,
  value: undefined
}
