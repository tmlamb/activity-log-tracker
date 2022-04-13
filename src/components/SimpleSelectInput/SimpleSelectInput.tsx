import React, { useState } from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import { BaseEntity } from '../../types'
import { ButtonContainer } from '../ButtonContainer'
import { PrimaryText, SecondaryText } from '../Typography'

type Props = {
  name: string
  // onChangeOption: (option: BaseEntity) => void
  options: BaseEntity[]
  // onBlur: (e: BaseEntity) => void
  style?: ClassInput
  defaultIndex?: number
  disabled?: boolean
}

interface PropsFilled extends Props {
  defaultIndex: number
}

export default function SimpleSelectInput({
  name,
  // onChangeOption,
  options,
  // onBlur,
  style,
  defaultIndex,
  disabled
}: PropsFilled) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex)
  return (
    <View
      style={tw.style(
        'flex flex-row items-center justify-between p-3 mb-9 bg-slate-400 dark:bg-slate-700',
        style
      )}
    >
      <PrimaryText style={tw`text-lg leading-tight`}>{name}</PrimaryText>
      <View>
        {selectedIndex >= 0 && (
          <SecondaryText style={tw`text-lg leading-tight`}>
            {options[selectedIndex].name}
          </SecondaryText>
        )}
        {!disabled && (
          <ButtonContainer style={tw``} onPress={() => null}>
            openmodal
          </ButtonContainer>
        )}
      </View>
    </View>
  )
}

SimpleSelectInput.defaultProps = {
  style: undefined,
  disabled: false,
  defaultIndex: -1
}
