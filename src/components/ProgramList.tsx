import React from 'react'
import { FlatList } from 'react-native'
import 'react-native-get-random-values'
import { tw } from '../tailwind'
import { Program } from '../types'
import NavigationLink from './Navigation/NavigationLink'
import { PrimaryText } from './Typography'

type Props = {
  programs: Program[]
}

export default function ProgramList({ programs }: Props) {
  return (
    <FlatList
      data={programs}
      renderItem={({ item }) => (
        <NavigationLink
          navigationParams={{ programId: (item as Program).programId }}
          screen="ProgramDetailScreen"
        >
          <PrimaryText style={tw``}>{item.name}</PrimaryText>
        </NavigationLink>
      )}
      keyExtractor={item => (item as Program).programId}
    />
  )
}
