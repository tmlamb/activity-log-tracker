import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import { PrimaryText, SecondaryText } from './Typography'

type Props = {
  label: string
  value?: string
  style?: ClassInput
  disabled?: boolean
}

export default function Card({ label, value, style, disabled }: Props) {
  return (
    <View
      style={tw.style(
        'dark:bg-slate-900 bg-slate-200 px-4 py-2 flex flex-row items-center justify-between',
        style
      )}
    >
      <PrimaryText style={tw``}>{label}</PrimaryText>
      <SecondaryText style={tw``}>{value}</SecondaryText>
      {!disabled && (
        <SecondaryText>
          <AntDesign name="right" size={16} />
        </SecondaryText>
      )}
    </View>
  )
}

Card.defaultProps = {
  style: undefined,
  value: undefined,
  disabled: false
}
