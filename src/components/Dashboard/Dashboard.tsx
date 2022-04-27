import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { SectionList, View } from 'react-native'
import { tw } from '../../tailwind'
import { Program } from '../../types'
import CardInfo from '../CardInfo'
import HeaderRightContainer from '../HeaderRightContainer'
import NavigationLink from '../Navigation/NavigationLink'
import { PrimaryText, SecondaryText, SpecialText } from '../Typography'

type Props = {
  programs: Program[]
}

export default function Dashboard({ programs }: Props) {
  return (
    <>
      <HeaderRightContainer>
        <NavigationLink screen="ProgramFormModal">
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </NavigationLink>
      </HeaderRightContainer>
      <View style={tw``}>
        <PrimaryText style={tw`text-4xl font-bold tracking-tight pb-9`}>
          Activity Log Tracker
        </PrimaryText>
        {programs.length > 0 && (
          <SectionList
            keyExtractor={program => (program as Program).programId}
            style={tw`pb-1.5`}
            sections={[{ title: 'Workout Programs', data: programs }]}
            renderSectionHeader={({ section: { title } }) => (
              <SecondaryText style={tw`pl-4 pb-1.5 uppercase text-sm`}>{title}</SecondaryText>
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
        )}
        {programs.length < 1 && (
          <SecondaryText style={tw`pl-4 text-xs`}>
            Add a new program to your Activity Log Tracker list using the &apos;+&apos; button in
            the upper right.
          </SecondaryText>
        )}
      </View>
    </>
  )
}
