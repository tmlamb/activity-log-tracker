import React from 'react'
import { SectionList, SectionListRenderItem } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import { SecondaryText } from './Typography'

type Props = {
  sections: { title: string; data: unknown[] }[]
  style: ClassInput
  renderItem:
    | SectionListRenderItem<
        unknown,
        {
          title: string
          data: unknown[]
        }
      >
    | undefined
  keyExtractor: ((item: unknown, index: number) => string) | undefined
}

export default function SimpleSectionList({ sections, style, renderItem, keyExtractor }: Props) {
  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={({ section: { title } }) => (
        <SecondaryText style={tw`ml-4 pb-1.5 uppercase text-sm`}>{title}</SecondaryText>
      )}
      style={tw.style('', style)}
    />
  )
}
