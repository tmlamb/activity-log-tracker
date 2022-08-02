import { AntDesign } from '@expo/vector-icons'
import _ from 'lodash'
import React from 'react'
import { SectionList } from 'react-native'
import tw from '../tailwind'
import { Program } from '../types'
import HeaderLeftContainer from './HeaderLeftContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

type Props = {
  programs: Program[]
}

export default function Dashboard({ programs }: Props) {
  return (
    <>
      <HeaderLeftContainer>
        <LinkButton to={{ screen: 'SettingsScreen' }} style={tw`py-6 pl-2.5 pr-8 -my-6 -ml-4`}>
          <SpecialText>
            <AntDesign name="setting" size={24} />
          </SpecialText>
        </LinkButton>
      </HeaderLeftContainer>
      <SectionList
        keyExtractor={program => program.programId}
        contentContainerStyle={tw`pb-48 pt-9 px-3`}
        bounces={false}
        sections={[{ title: 'Workout Programs', data: programs }]}
        ListHeaderComponent={
          <PrimaryText style={tw`text-4xl font-bold tracking-tight pb-9`}>
            {`Workout\nActivity Log Tracker`}
          </PrimaryText>
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <SecondaryText style={tw`pl-3 pb-1.5 uppercase text-sm`}>
            {data.length ? title : undefined}
          </SecondaryText>
        )}
        renderItem={({ index, item, section }) => (
          <LinkButton
            to={{
              screen: 'ProgramDetailScreen',
              params: { programId: item.programId }
            }}
          >
            <ThemedView
              style={tw.style(
                'border-b-2',
                index === 0 ? 'rounded-t-xl' : undefined,
                index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
              )}
            >
              <PrimaryText style={tw`flex-1 pr-2.5`} numberOfLines={1}>
                {item.name}
              </PrimaryText>
              <SecondaryText style={tw`absolute right-2`}>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            </ThemedView>
          </LinkButton>
        )}
        ListFooterComponent={
          <>
            {programs.length < 1 && (
              <>
                <SecondaryText style={tw`pb-9 px-3 text-xs`}>
                  To get started, first create a new workout program, which will be used to track
                  your workout sessions.
                </SecondaryText>
                <LinkButton to={{ screen: 'ProgramFormModal' }} style={tw``}>
                  <ThemedView rounded>
                    <SpecialText>Create Workout Program</SpecialText>
                  </ThemedView>
                </LinkButton>
              </>
            )}
            {programs.length > 0 && _.sumBy(programs, o => o.sessions.length) < 4 && (
              <SecondaryText style={tw`pl-3 pt-1.5 text-xs`}>
                Select a program to start planning workout sessions.
              </SecondaryText>
            )}
          </>
        }
      />
    </>
  )
}
