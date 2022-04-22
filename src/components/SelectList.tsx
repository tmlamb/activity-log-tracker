import React from 'react'
import { ScrollView } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'

type Props = {
  items: Partial<unknown>[]
  onValueChange: (value: Partial<unknown>) => void
  value?: Partial<unknown>
  style?: ClassInput
  stringify: (value: Partial<unknown>) => string
  keyExtractor: (value: Partial<unknown>, index: number) => string
}

export default function SelectList({
  items,
  onValueChange,
  value,
  style,
  stringify,
  keyExtractor
}: Props) {
  return (
    <ScrollView style={tw`px-4`}>
      {items.map((item, index) => (
        // <View key={keyExtractor(item)}>
        //   <PrimaryText>{stringify(item)}</PrimaryText>
        // </View>
        <ButtonContainer key={keyExtractor(item, index)} onPress={() => onValueChange(item)}>
          <CardInfo
            primaryText={stringify(item)}
            style={tw.style(
              'border-b-2',
              index === 0 ? 'rounded-t-xl' : undefined,
              index === items.length - 1 ? 'rounded-b-xl border-b-0' : undefined
            )}
          />
        </ButtonContainer>
      ))}
    </ScrollView>
  )
}

SelectList.defaultProps = {
  style: undefined,
  value: undefined
}
