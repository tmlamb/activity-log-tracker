import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'

type Props = {
  style?: ClassInput
  children: React.ReactNode
}

export default function Card({ style, children }: Props) {
  return (
    <View
      style={tw.style(
        'dark:bg-slate-800 dark:border-slate-700 border-slate-300 bg-slate-200',
        style
      )}
    >
      {children}
    </View>
  )
}

Card.defaultProps = {
  style: undefined
}
