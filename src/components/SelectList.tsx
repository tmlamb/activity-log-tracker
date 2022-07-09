import React from 'react'
import { FlatList } from 'react-native'
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
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      style={tw`flex-grow pb-36`}
      renderItem={({ item, index }) => (
        <ButtonContainer onPress={() => onValueChange(item)}>
          <CardInfo
            primaryText={stringify(item)}
            style={tw.style(
              'border-b-2',
              index === 0 ? 'rounded-t-xl' : undefined,
              index === items.length - 1 ? 'rounded-b-xl border-b-0' : undefined
            )}
          />
        </ButtonContainer>
      )}
    />
  )
}

SelectList.defaultProps = {
  style: undefined,
  value: undefined
}
