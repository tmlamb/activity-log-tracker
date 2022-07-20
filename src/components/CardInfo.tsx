import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import Card from './Card'
import { AlertText, PrimaryText, SecondaryText, SpecialText } from './Typography'

type Props = {
  primaryText?: string
  secondaryText?: string
  specialText?: string
  alertText?: string
  centeredText?: string
  rightIcon?: React.ReactNode
  leftIcon?: React.ReactNode
  style?: ClassInput
  textStyle?: ClassInput
  reverse?: boolean
  innerRef?: React.LegacyRef<View>
}

export default function CardInfo({
  primaryText,
  secondaryText,
  specialText,
  alertText,
  centeredText,
  rightIcon,
  leftIcon,
  style,
  textStyle,
  reverse,
  innerRef
}: Props) {
  return (
    <Card
      style={tw.style(
        'py-2.5 px-3 flex-row justify-between',
        reverse ? 'flex-row-reverse' : undefined,
        style
      )}
      innerRef={innerRef}
    >
      <View style={tw.style('flex-row items-center mr-5', leftIcon ? 'pl-6 relative' : undefined)}>
        {leftIcon && <View style={tw.style('absolute left-0')}>{leftIcon}</View>}
        {alertText && (
          <AlertText style={tw.style('text-lg leading-tight', textStyle)}>{alertText}</AlertText>
        )}
        {primaryText && (
          <PrimaryText style={tw.style('text-lg leading-tight', textStyle)}>
            {primaryText}
          </PrimaryText>
        )}
      </View>
      {centeredText && (
        <View style={tw`flex-row items-start justify-between flex-shrink`}>
          <SecondaryText
            style={tw.style(
              'leading-tight text-lg flex-shrink',
              reverse ? 'pl-0' : undefined,
              textStyle
            )}
          >
            {centeredText}
          </SecondaryText>
        </View>
      )}
      <View style={tw`flex-row items-center justify-between flex-shrink`}>
        {secondaryText && (
          <SecondaryText
            numberOfLines={1}
            style={tw.style(
              'leading-tight text-lg flex-shrink',
              rightIcon ? 'pr-5' : undefined,
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
              rightIcon ? 'pr-5' : undefined,
              reverse ? 'pl-0' : undefined,
              textStyle
            )}
          >
            {specialText}
          </SpecialText>
        )}
        {rightIcon && <View style={tw`absolute right-0`}>{rightIcon}</View>}
      </View>
    </Card>
  )
}

CardInfo.defaultProps = {
  primaryText: undefined,
  secondaryText: undefined,
  specialText: undefined,
  alertText: undefined,
  centeredText: undefined,
  rightIcon: undefined,
  leftIcon: undefined,
  style: undefined,
  textStyle: undefined,
  reverse: false,
  innerRef: undefined
}
