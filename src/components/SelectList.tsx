import React from 'react'
import { FlatList, ListRenderItem } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import ButtonContainer from './ButtonContainer'

type Props = {
  items: Partial<unknown>[]
  style?: ClassInput
  keyExtractor: (value: Partial<unknown>, index: number) => string
  scrollEnabled?: boolean
  ListHeaderComponent?: JSX.Element
  renderItem: ListRenderItem<Partial<unknown>> | null | undefined
  onSelect: (value: Partial<unknown>) => void
}

export default function SelectList({
  items,
  style,
  keyExtractor,
  scrollEnabled,
  ListHeaderComponent,
  renderItem,
  onSelect
}: Props) {
  return (
    <FlatList
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={tw`pb-36`}
      data={items}
      scrollEnabled={scrollEnabled}
      keyExtractor={keyExtractor}
      style={tw.style(style, 'flex-grow')}
      renderItem={theItem => (
        <ButtonContainer onPress={() => onSelect(theItem.item)}>
          {renderItem && renderItem(theItem)}
        </ButtonContainer>
      )}
    />
  )
}

SelectList.defaultProps = {
  style: undefined,
  scrollEnabled: true,
  ListHeaderComponent: undefined
}
