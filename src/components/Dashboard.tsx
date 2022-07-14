import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { SectionList } from 'react-native'
import { tw } from '../tailwind'
import { Program } from '../types'
import CardInfo from './CardInfo'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import NavigationLink from './Navigation/NavigationLink'
import { PrimaryText, SecondaryText, SpecialText } from './Typography'

type Props = {
  programs: Program[]
}

export default function Dashboard({ programs }: Props) {
  return (
    <>
      <HeaderRightContainer>
        <NavigationLink screen="ProgramFormModal" style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}>
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </NavigationLink>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <NavigationLink screen="ExerciseSettingsScreen" style={tw`py-6 pl-3 pr-8 -my-6 -ml-4`}>
          <SpecialText>
            <AntDesign name="setting" size={24} />
          </SpecialText>
        </NavigationLink>
      </HeaderLeftContainer>
      <SectionList
        keyExtractor={program => (program as Program).programId}
        style={tw`flex-grow px-3 py-9`}
        contentContainerStyle={tw`pb-48`}
        sections={[{ title: 'Workout Programs', data: programs }]}
        ListHeaderComponent={
          <PrimaryText style={tw`text-4xl font-bold tracking-tight pb-9`}>
            Activity Log Tracker
          </PrimaryText>
        }
        ListFooterComponent={
          (programs.length < 1 && (
            <SecondaryText style={tw`pl-3 text-xs`}>
              Add a new workout program using the &apos;+&apos; button in the upper right.
            </SecondaryText>
          )) ||
          undefined
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <SecondaryText style={tw`pl-3 pb-1.5 uppercase text-sm`}>
            {data.length ? title : undefined}
          </SecondaryText>
        )}
        renderItem={({ index, item, section }) => (
          <NavigationLink
            screen="ProgramDetailScreen"
            navigationParams={{ programId: (item as Program).programId }}
          >
            <CardInfo
              style={tw.style(
                'border-b-2',
                index === 0 ? 'rounded-t-xl' : undefined,
                index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
              )}
              primaryText={(item as Program).name}
              rightIcon={
                <SecondaryText>
                  <AntDesign name="right" size={16} />
                </SecondaryText>
              }
            />
          </NavigationLink>
        )}
      />
    </>
  )
}
