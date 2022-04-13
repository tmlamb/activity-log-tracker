import React from 'react'
import { Text } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'

export const primaryTextColor = 'text-slate-900 dark:text-white'
export const secondaryTextColor = 'text-slate-700 dark:text-slate-400'

type CommonProps = {
  children: React.ReactNode
  style?: ClassInput
}

export function PrimaryText({ children, style }: CommonProps) {
  return <Text style={tw.style('text-lg', primaryTextColor, style)}>{children}</Text>
}

export function SecondaryText({ children, style }: CommonProps) {
  return <Text style={tw.style('text-lg', secondaryTextColor, style)}>{children}</Text>
}

export function SpecialText({ children, style }: CommonProps) {
  return <Text style={tw.style('text-lg text-sky-600 dark:text-sky-300', style)}>{children}</Text>
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
