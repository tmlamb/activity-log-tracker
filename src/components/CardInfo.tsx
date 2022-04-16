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
  style?: ClassInput
}

export default function CardInfo({
  primaryText,
  secondaryText,
  specialText,
  alertText,
  rightIcon,
  style
}: Props) {
  return (
    <Card style={style}>
      <View style={tw.style('flex flex-row items-center justify-between')}>
        {alertText && <AlertText>{alertText}</AlertText>}
        {primaryText && <PrimaryText style={tw``}>{primaryText}</PrimaryText>}
        <View style={tw`flex flex-row`}>
          {secondaryText && <SecondaryText style={tw`pr-1.5`}>{secondaryText}</SecondaryText>}
          {specialText && <SpecialText style={tw``}>{specialText}</SpecialText>}
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
  rightIcon: React.Fragment,
  style: undefined
}
