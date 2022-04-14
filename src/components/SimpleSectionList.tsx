import React from 'react'
import { SectionList, SectionListRenderItem } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import { BaseEntity } from '../types'
import { SecondaryText } from './Typography'

type Props = {
  sections: { title: string; data: BaseEntity[] }[]
  style: ClassInput
  renderItem:
    | SectionListRenderItem<
        BaseEntity,
        {
          title: string
          data: BaseEntity[]
        }
      >
    | undefined
}

export default function SimpleSectionList({ sections, style, renderItem }: Props) {
  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.entityId}
      renderItem={renderItem}
      renderSectionHeader={({ section: { title } }) => (
        <SecondaryText style={tw`ml-4 pb-1.5 uppercase text-sm`}>{title}</SecondaryText>
      )}
      style={tw.style('', style)}
    />
  )
}
