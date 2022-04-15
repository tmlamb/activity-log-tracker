import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'

type Props = {
  style?: ClassInput
  children: React.ReactNode
}

export default function Card({ style, children }: Props) {
  return <View style={tw.style('dark:bg-slate-800 bg-slate-200 px-4 py-2', style)}>{children}</View>
}

Card.defaultProps = {
  style: undefined
}
