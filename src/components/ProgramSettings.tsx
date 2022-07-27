import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { FlatList } from 'react-native'
import tw from '../tailwind'
import { Program } from '../types'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

type Props = {
  programs: Program[]
}

export default function ProgramSettings({ programs }: Props) {
  return (
    <>
      <HeaderRightContainer>
        <LinkButton
          to={{ screen: 'ProgramFormModal' }}
          style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}
          disabled={programs.length > 100}
        >
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <FlatList
        contentContainerStyle={tw`px-3 pb-48 pt-9`}
        data={programs}
        bounces={false}
        renderItem={({ index, item }) => (
          <LinkButton
            to={{
              screen: 'ProgramFormModal',
              params: { programId: item.programId }
            }}
          >
            <ThemedView
              style={tw.style(
                index !== programs.length - 1 ? 'border-b-2' : 'border-b-0 rounded-b-xl',
                index === 0 ? 'rounded-t-xl' : undefined
              )}
            >
              <PrimaryText style={tw`flex-1`} numberOfLines={1}>
                {item.name}
              </PrimaryText>
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
