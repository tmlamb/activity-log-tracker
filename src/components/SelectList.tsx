import React from 'react'
import { FlatList, ListRenderItem } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'

type Props<T> = {
  items: Partial<T>[]
  style?: ClassInput
  keyExtractor: (value: Partial<T>, index: number) => string
  scrollEnabled?: boolean
  ListHeaderComponent?: JSX.Element
  contentContainerStyle?: ClassInput
  renderItem?: ListRenderItem<Partial<T>> | null
  onSelect: (value: Partial<T>) => void
}

export default function SelectList<T>({
  items,
  style,
  keyExtractor,
  scrollEnabled,
  ListHeaderComponent,
  contentContainerStyle,
  renderItem,
  onSelect
}: Props<T>) {
  return (
    <FlatList
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={tw.style(contentContainerStyle)}
      data={items}
      scrollEnabled={scrollEnabled}
      keyExtractor={keyExtractor}
      style={tw.style(style, 'flex-grow')}
      renderItem={item => (
        <ButtonContainer onPress={() => onSelect(item.item)}>
          {renderItem && renderItem(item)}
        </ButtonContainer>
      )}
    />
  )
}

SelectList.defaultProps = {
  style: undefined,
  scrollEnabled: true,
  ListHeaderComponent: undefined,
  contentContainerStyle: undefined,
  renderItem: undefined
}
