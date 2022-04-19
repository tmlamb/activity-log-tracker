import React from 'react'
import { Text } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'

export const primaryTextColor = 'text-slate-900 dark:text-white'
export const secondaryTextColor = 'text-slate-500 dark:text-slate-400'
export const specialTextColor = 'text-teal-600 dark:text-teal-500'
export const alertTextColor = 'text-red-500 dark:text-red-400'

type CommonProps = {
  children: React.ReactNode
  style?: ClassInput
}

export function PrimaryText({ children, style }: CommonProps) {
  return <Text style={tw.style(primaryTextColor, 'text-lg', style)}>{children}</Text>
}

export function SecondaryText({ children, style }: CommonProps) {
  return <Text style={tw.style(secondaryTextColor, 'text-lg', style)}>{children}</Text>
}

export function SpecialText({ children, style }: CommonProps) {
  return <Text style={tw.style(specialTextColor, 'text-lg', style)}>{children}</Text>
}

export function AlertText({ children, style }: CommonProps) {
  return <Text style={tw.style(alertTextColor, 'text-lg', style)}>{children}</Text>
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
AlertText.defaultProps = {
  style: undefined
}
