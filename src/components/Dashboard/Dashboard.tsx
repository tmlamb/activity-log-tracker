import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { FlatList, useColorScheme, View } from 'react-native'
import { tw } from '../../tailwind'
import { Program } from '../../types'
import { HeaderRightContainer } from '../HeaderRightContainer'
import NavigationLink from '../Navigation/NavigationLink'
import { PrimaryText, SpecialText } from '../Typography'

type Props = {
  programs: Program[]
}

export default function Dashboard({ programs }: Props) {
  const otherScheme = useColorScheme()
  console.log(otherScheme)
  return (
    <>
      <HeaderRightContainer>
        <NavigationLink screen="ProgramFormModal">
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </NavigationLink>
      </HeaderRightContainer>
      <View style={tw`flex flex-col p-2`}>
        <PrimaryText style={tw`pb-1 text-4xl font-bold tracking-tight`}>
          Activity Log Tracker
        </PrimaryText>
        <FlatList
          data={programs}
          renderItem={({ item }) => (
            <NavigationLink entityId={item.entityId} screen="ProgramDetailScreen">
              <PrimaryText style={tw``}>{item.name}</PrimaryText>
            </NavigationLink>
          )}
          keyExtractor={item => item.entityId}
        />
      </View>
    </>
  )
}
