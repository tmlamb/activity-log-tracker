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
  textStyle?: ClassInput
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
  textStyle,
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
          {leftIcon && <View style={tw.style('mr-4 -mt-1 -mb-1')}>{leftIcon}</View>}
          {alertText && <AlertText style={tw`text-lg leading-tight`}>{alertText}</AlertText>}
          {primaryText && (
            <PrimaryText style={tw.style('text-lg leading-tight', textStyle)}>
              {primaryText}
            </PrimaryText>
          )}
        </View>
        <View style={tw`flex flex-row items-center justify-start`}>
          {secondaryText && (
            <SecondaryText
              style={tw.style('leading-tight text-lg', reverse ? 'pl-0' : undefined, textStyle)}
            >
              {secondaryText}
            </SecondaryText>
          )}
          {specialText && (
            <SpecialText
              style={tw.style(
                'pl-1.5 text-lg leading-tight',
                reverse ? 'pl-0' : undefined,
                textStyle
              )}
            >
              {specialText}
            </SpecialText>
          )}
          {rightIcon && <View style={tw`pl-1.5 -mt-1 -mb-1`}>{rightIcon}</View>}
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
  textStyle: undefined,
  reverse: false
}
