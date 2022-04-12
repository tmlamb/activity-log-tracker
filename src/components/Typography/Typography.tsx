import React from 'react'
import { Text } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'

export const primaryTextStyle = () => tw`text-lg text-slate-900 dark:text-white`

type CommonProps = {
  children: React.ReactNode
  style?: ClassInput
}

export function PrimaryText({ children, style }: CommonProps) {
  return <Text style={tw.style(primaryTextStyle(), style)}>{children}</Text>
}

export function SecondaryText({ children, style }: CommonProps) {
  return (
    <Text style={tw.style('text-lg text-slate-600 dark:text-slate-400', style)}>{children}</Text>
  )
}

export function SpecialText({ children, style }: CommonProps) {
  return <Text style={tw.style('text-lg text-sky-600 dark:text-sky-400', style)}>{children}</Text>
}

PrimaryText.defaultProps = {
  style: undefined
}
SecondaryText.defaultProps = {
  style: undefined
}
SpecialText.defaultProps = {
  style: undefined
}
