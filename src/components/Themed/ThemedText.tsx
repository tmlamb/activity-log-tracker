import React from 'react'
import { Text } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../../tailwind'

export const primaryTextColor = 'text-slate-900 dark:text-white'
export const secondaryTextColor = 'text-slate-500 dark:text-slate-400'
export const specialTextColor = 'text-sky-600 dark:text-sky-400'
export const alertTextColor = 'text-red-500 dark:text-red-400'

type CommonProps = {
  children: React.ReactNode
  style?: ClassInput
  numberOfLines?: number
}

export function PrimaryText({ children, style, numberOfLines }: CommonProps) {
  return (
    <Text numberOfLines={numberOfLines} style={tw.style(primaryTextColor, 'text-lg', style)}>
      {children}
    </Text>
  )
}

export function SecondaryText({ children, style, numberOfLines }: CommonProps) {
  return (
    <Text numberOfLines={numberOfLines} style={tw.style(secondaryTextColor, 'text-lg', style)}>
      {children}
    </Text>
  )
}

export function SpecialText({ children, style, numberOfLines }: CommonProps) {
  return (
    <Text numberOfLines={numberOfLines} style={tw.style(specialTextColor, 'text-lg', style)}>
      {children}
    </Text>
  )
}

export function AlertText({ children, style, numberOfLines }: CommonProps) {
  return (
    <Text numberOfLines={numberOfLines} style={tw.style(alertTextColor, 'text-lg', style)}>
      {children}
    </Text>
  )
}

PrimaryText.defaultProps = {
  style: undefined,
  numberOfLines: undefined
}
SecondaryText.defaultProps = {
  style: undefined,
  numberOfLines: undefined
}
SpecialText.defaultProps = {
  style: undefined,
  numberOfLines: undefined
}
AlertText.defaultProps = {
  style: undefined,
  numberOfLines: undefined
}
