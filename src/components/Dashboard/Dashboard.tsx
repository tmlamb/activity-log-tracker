import React from 'react'
import { FlatList, Text } from 'react-native'
import { Program } from '../../types'
import NavigationLink from '../Navigation/NavigationLink'

type Props = {
  programs: Program[]
}

export default function Dashboard({ programs }: Props) {
  return (
    <FlatList
      data={programs}
      renderItem={({ item }) => (
        <NavigationLink id={item.id} screen="ProgramDetailScreen">
          <Text>{item.name}</Text>
        </NavigationLink>
      )}
      keyExtractor={item => item.id}
    />
  )
}
