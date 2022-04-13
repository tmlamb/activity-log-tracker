import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { SectionList, View } from 'react-native'
import { tw } from '../../tailwind'
import { BaseEntity } from '../../types'
import { PrimaryText, SecondaryText } from '../Typography'

type Props = {
  sections: { title: string; data: BaseEntity[] }[]
}

export default function SimpleSectionList({ sections }: Props) {
  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.entityId}
      renderItem={({ index, item, section }) => (
        <View
          style={tw.style(
            'dark:bg-slate-900 bg-slate-200 p-3 border-b-2 border-slate-800',
            index === 0 ? 'rounded-t-xl' : undefined,
            index === section.data.length - 1 ? 'rounded-b-xl' : undefined
          )}
        >
          <PrimaryText>{item.name}</PrimaryText>
          <SecondaryText>
            <AntDesign name="caretright" size={32} />
          </SecondaryText>
        </View>
      )}
      renderSectionHeader={({ section: { title } }) => (
        <SecondaryText style={tw`ml-7 uppercase`}>{title}</SecondaryText>
      )}
      style={tw``}

      // renderSectionHeader={}
    />
  )
}
