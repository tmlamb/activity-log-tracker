import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import { tw } from '../../tailwind'
import { Program } from '../../types'
import { HeaderRightContainer } from '../HeaderRightContainer'
import NavigationLink from '../Navigation/NavigationLink'
import { SimpleSectionList } from '../SimpleSectionList'
import { PrimaryText, SpecialText } from '../Typography'

type Props = {
  programs: Program[]
}

export default function Dashboard({ programs }: Props) {
  return (
    <>
      <HeaderRightContainer>
        <NavigationLink screen="ProgramFormModal">
          <SpecialText>
            <AntDesign name="plus" size={32} />
          </SpecialText>
        </NavigationLink>
      </HeaderRightContainer>
      <View style={tw`flex flex-col p-2`}>
        <PrimaryText style={tw`pb-3 text-4xl font-bold tracking-tight`}>
          Activity Log Tracker
        </PrimaryText>
        <SimpleSectionList sections={[{ title: 'Programs', data: programs }]} />
      </View>
    </>
  )
}
