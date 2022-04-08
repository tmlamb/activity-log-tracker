import React from 'react'
import { FlatList, Text } from 'react-native'
import { Program } from '../../types'
import NavigationLink from '../Navigation/NavigationLink'

type Props = {
  program: Program
}

export default function ProgramDetail({ program }: Props) {
  return (
    <>
      <Text>{program.name}</Text>
      <FlatList
        data={program.sessions}
        renderItem={({ item }) => (
          <NavigationLink id={item.id} screen="SessionDetailScreen">
            <Text>{item.name}</Text>
          </NavigationLink>
        )}
      />
    </>
  )
}
