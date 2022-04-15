import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import { tw } from '../../tailwind'
import { Program } from '../../types'
import HeaderRightContainer from '../HeaderRightContainer'
import InfoCard from '../InfoCard'
import NavigationLink from '../Navigation/NavigationLink'
import SimpleSectionList from '../SimpleSectionList'
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
      <View style={tw`flex flex-col`}>
        <PrimaryText style={tw`text-4xl font-bold tracking-tight pb-9`}>
          Activity Log Tracker
        </PrimaryText>
        {programs.length > 0 && (
          <SimpleSectionList
            style={tw`pb-1.5`}
            sections={[{ title: 'Workout Programs', data: programs }]}
            renderItem={({ index, item, section }) => (
              <NavigationLink
                screen="ProgramDetailScreen"
                navigationParams={{ programId: (item as Program).programId }}
              >
                <InfoCard
                  style={tw.style(
                    'border-b-2 dark:border-slate-700 border-slate-300',
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
