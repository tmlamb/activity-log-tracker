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
    <Card
      style={tw.style(
        'py-2.5 px-3 flex-row justify-between',
        reverse ? 'flex-row-reverse' : undefined,
        style
      )}
    >
      {/* <View
        style={tw.style(
          'flex flex-row items-center justify-between',
          reverse ? 'flex-row-reverse' : undefined
        )}
      > */}
      <View style={tw`flex-row items-center flex-shrink`}>
        {leftIcon && <View style={tw.style('mr-3 -mt-1 -mb-1')}>{leftIcon}</View>}
        {alertText && (
          <AlertText style={tw.style('text-lg leading-tight', textStyle)}>{alertText}</AlertText>
        )}
        {primaryText && (
          <PrimaryText style={tw.style('text-lg leading-tight', textStyle)}>
            {primaryText}
          </PrimaryText>
        )}
      </View>
      <View style={tw`flex-row items-center justify-between flex-shrink`}>
        {secondaryText && (
          <SecondaryText
            style={tw.style(
              'leading-tight text-lg flex-shrink',
              reverse ? 'pl-0' : undefined,
              textStyle
            )}
          >
            {secondaryText}
          </SecondaryText>
        )}
        {specialText && (
          <SpecialText
            style={tw.style(
              'pl-1.5 text-lg flex-shrink leading-tight',
              reverse ? 'pl-0' : undefined,
              textStyle
            )}
          >
            {specialText}
          </SpecialText>
        )}
        {rightIcon && <View style={tw`pl-2`}>{rightIcon}</View>}
      </View>
      {/* </View> */}
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
