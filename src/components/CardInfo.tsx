import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import Card from './Card'
import { AlertText, PrimaryText, SecondaryText, SpecialText } from './Typography'

type Props = {
  primaryText?: string
  secondaryText?: string
  specialText?: string
  alertText?: string
  rightIcon?: React.ReactNode
  leftIcon?: React.ReactNode
  style?: ClassInput
  reverse?: boolean
}

export default function CardInfo({
  primaryText,
  secondaryText,
  specialText,
  alertText,
  rightIcon,
  leftIcon,
  style,
  reverse
}: Props) {
  return (
    <Card style={tw.style('py-3 px-4', style)}>
      <View
        style={tw.style(
          'flex flex-row items-center justify-between',
          reverse ? 'flex-row-reverse' : undefined
        )}
      >
        <View style={tw`flex flex-row items-center justify-start`}>
          {leftIcon && <View style={tw.style('mr-4')}>{leftIcon}</View>}
          {alertText && <AlertText style={tw`text-lg leading-tight`}>{alertText}</AlertText>}
          {primaryText && (
            <PrimaryText style={tw`text-lg leading-tight`}>{primaryText}</PrimaryText>
          )}
        </View>
        <View style={tw`flex flex-row items-center justify-start`}>
          {secondaryText && (
            <SecondaryText style={tw`pr-1.5 leading-tight text-lg`}>{secondaryText}</SecondaryText>
          )}
          {specialText && (
            <SpecialText style={tw`text-lg leading-tight`}>{specialText}</SpecialText>
          )}
          {rightIcon}
        </View>
      </View>
    </Card>
  )
}

CardInfo.defaultProps = {
  primaryText: undefined,
  secondaryText: undefined,
  specialText: undefined,
  alertText: undefined,
  rightIcon: undefined,
  leftIcon: undefined,
  style: undefined,
  reverse: false
}
