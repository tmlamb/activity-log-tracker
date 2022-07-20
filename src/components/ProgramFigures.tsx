import React from 'react'
import { ScrollView } from 'react-native'
import tw from '../tailwind'
import { Program } from '../types'
import CardInfo from './CardInfo'

type Props = {
  program: Program
}

export default function ProgramFigures({ program }: Props) {
  return (
    <ScrollView style={tw`px-3`} contentContainerStyle={tw`pb-48 mt-9`}>
      <CardInfo
        style={tw`border-b-2 rounded-t-xl`}
        primaryText="Program"
        secondaryText={program.name}
      />
      <CardInfo
        style={tw`rounded-b-xl`}
        primaryText="Sessions Completed"
        secondaryText={String(
          program.sessions.filter(session => session.status === 'Done').length || 0
        )}
      />
    </ScrollView>
  )
}
