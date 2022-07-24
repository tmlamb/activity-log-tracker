import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { FlatList } from 'react-native'
import tw from '../tailwind'
import { Program } from '../types'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, ThemedView } from './Themed'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  programs: Program[]
}

export default function ProgramSettings({ programs }: Props) {
  return (
    <>
      <HeaderRightContainer>
        <LinkButton to={{ screen: 'ProgramFormModal' }} style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}>
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <FlatList
        style={tw`flex-grow px-3 py-9`}
        contentContainerStyle={tw`pb-48`}
        data={programs}
        renderItem={({ index, item }) => (
          <LinkButton
            to={{
              screen: 'ProgramFormModal',
              params: { programId: item.programId }
            }}
          >
            <ThemedView
              style={tw.style(
                'border-b-2',
                index === 0 ? 'rounded-t-xl' : undefined,
                index === programs.length - 1 ? 'rounded-b-xl border-b-0' : undefined
              )}
            >
              <PrimaryText>{item.name}</PrimaryText>
              <SecondaryText style={tw`pr-5`}>
                {`${item.sessions.length} session${item.sessions.length !== 1 ? 's' : ''}`}
              </SecondaryText>
              <SecondaryText style={tw`absolute right-2`}>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            </ThemedView>
          </LinkButton>
        )}
      />
    </>
  )
}
