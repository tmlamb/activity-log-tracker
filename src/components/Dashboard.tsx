import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { SectionList } from 'react-native'
import tw from '../tailwind'
import { Program } from '../types'
import CardInfo from './CardInfo'
import HeaderLeftContainer from './HeaderLeftContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText } from './Typography'

type Props = {
  programs: Program[]
}

export default function Dashboard({ programs }: Props) {
  return (
    <>
      <HeaderLeftContainer>
        <LinkButton to={{ screen: 'SettingsScreen' }} style={tw`py-6 pl-3 pr-8 -my-6 -ml-4`}>
          <SpecialText>
            <AntDesign name="setting" size={24} />
          </SpecialText>
        </LinkButton>
      </HeaderLeftContainer>
      <SectionList
        keyExtractor={program => (program as Program).programId}
        style={tw`flex-grow px-3 pb-9`}
        contentContainerStyle={tw`pb-48`}
        sections={[{ title: 'Workout Programs', data: programs }]}
        ListHeaderComponent={
          <PrimaryText style={tw`text-4xl font-bold tracking-tight pb-9`}>
            Activity Log Tracker
          </PrimaryText>
        }
        ListFooterComponent={
          <>
            {programs.length < 1 && (
              <>
                <LinkButton to={{ screen: 'ProgramFormModal' }} style={tw``}>
                  <CardInfo
                    style={tw.style('rounded-xl')}
                    specialText="Create Workout Program"
                    reverse
                  />
                </LinkButton>
                <SecondaryText style={tw`pt-1.5 pl-3 text-xs`}>
                  Add a new program to start planning workouts.
                </SecondaryText>
              </>
            )}
            {programs.length > 0 &&
              programs.reduce((total, program) => total + program.sessions.length, 0) < 4 && (
                <SecondaryText style={tw`pl-3 pt-1.5 text-xs`}>
                  Select a program to start planning workout sessions.
                </SecondaryText>
              )}
          </>
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
            <CardInfo
              style={tw.style(
                'border-b-2',
                index === 0 ? 'rounded-t-xl' : undefined,
                index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
              )}
              primaryText={item.name}
              rightIcon={
                <SecondaryText>
                  <AntDesign name="right" size={16} />
                </SecondaryText>
              }
            />
          </LinkButton>
        )}
      />
    </>
  )
}
