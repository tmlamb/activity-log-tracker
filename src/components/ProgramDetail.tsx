import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import { tw } from '../tailwind'
import { Program, Session } from '../types'
import { isToday, mapSessionsByDate } from '../utils'
import HeaderRightContainer from './HeaderRightContainer'
import InfoCard from './InfoCard'
import NavigationLink from './Navigation/NavigationLink'
import SimpleSectionList from './SimpleSectionList'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  program: Program
}

// One day in milliseconds
const oneDay = 1000 * 60 * 60 * 24

export default function ProgramDetail({ program }: Props) {
  const formatDate = (date: Date) => {
    const daysDiff =
      program && program.sessions && program.sessions.length > 0
        ? Math.floor((date.getTime() - program.sessions[0].start.getTime()) / oneDay)
        : 0
    const week = Math.floor(daysDiff / 7)
    const day = daysDiff % 7
    return `${week ? `Week ${week + 1}, ` : ''}Day ${day + 1}${isToday(date) ? ' (Today)' : ''}`
  }

  // We need to show the list of workout sessions grouped by date, so we first
  // convert the array of programs into a map where the key is the program date
  // and the value is the array of sessions for that date. The date key format
  // callback will use 'Today' if the date is today, otherwise it will use the
  // number of weeks and days since the first session, e.g. 'Week 2, Day 4'.
  const sessions = mapSessionsByDate(program.sessions, formatDate)
  // The SectionList component expects an array of objects with a 'title' and
  // 'data' property. The 'title' property will be used as the section header
  // and the 'data' property will be used as the list of items in that section.
  const sections = Array.from(sessions, ([title, data]) => ({
    title,
    data
  })).reverse() // Reverse to show most recent at the top.

  return (
    <>
      <HeaderRightContainer>
        <NavigationLink screen="SessionFormModal">
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </NavigationLink>
      </HeaderRightContainer>

      <View style={tw`flex flex-col`}>
        <NavigationLink
          screen="ProgramFormModal"
          navigationParams={{ programId: program.programId }}
        >
          <InfoCard style={tw`rounded-xl mb-9`} primaryText={program.name} specialText="Edit" />
        </NavigationLink>
        {(!sections || sections.length === 0 || sections[0].title.includes('TODAY')) && (
          <SimpleSectionList
            style={tw`pb-9`}
            sections={[{ title: formatDate(new Date()), data: [{ name: 'foo' }] }]}
            renderItem={({ index, section }) => (
              <NavigationLink screen="SessionFormModal">
                <InfoCard
                  style={tw.style(
                    'border-b-2 dark:border-slate-800 border-slate-300',
                    index === 0 ? 'rounded-t-xl' : undefined,
                    index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
                  )}
                  specialText="Plan Workout Session"
                  // rightIcon={
                  //   <SecondaryText>
                  //     <AntDesign name="right" size={16} />
                  //   </SecondaryText>
                  // }
                />
              </NavigationLink>
            )}
          />
        )}
        {sections && sections.length > 0 && (
          <SimpleSectionList
            style={tw`pb-9`}
            sections={sections}
            renderItem={({ index, item, section }) => (
              <NavigationLink
                style={tw`mb-9`}
                navigationParams={{
                  programId: program.programId,
                  sessionId: (item as Session).sessionId
                }}
                screen="SessionDetailScreen"
              >
                <InfoCard
                  style={tw.style(
                    'border-b-2 dark:border-slate-800 border-slate-300',
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
        {program.sessions.length < 1 && (
          <SecondaryText style={tw`pl-4 text-xs`}>
            Start tracking workouts by planning a session.
          </SecondaryText>
        )}
      </View>
    </>
  )
}
