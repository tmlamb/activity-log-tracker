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
          accessibilityLabel="Navigate to Create Workout Program Form"
        >
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <FlatList
        style={tw`pt-9 pb-12`}
        data={programs}
        renderItem={({ index, item }) => (
          <LinkButton
            to={{
              screen: 'ProgramFormModal',
              params: { programId: item.programId }
            }}
            accessibilityLabel={`Navigate to Edit Workout Program with name ${item.name}`}
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
