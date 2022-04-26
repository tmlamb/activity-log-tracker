import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { SectionList, View } from 'react-native'
import { tw } from '../tailwind'
import { Program, Session } from '../types'
import { isToday, mapSessionsByDate } from '../utils'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import NavigationLink from './Navigation/NavigationLink'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  program: Program
}

// One day in milliseconds
const oneDay = 1000 * 60 * 60 * 24

export function SessionFormLink({
  programId,
  sessionId,
  children
}: {
  programId: string
  sessionId?: string
  children: React.ReactNode
}) {
  return (
    <NavigationLink screen="SessionFormModal" navigationParams={{ programId, sessionId }}>
      {children}
    </NavigationLink>
  )
}
SessionFormLink.defaultProps = {
  sessionId: undefined
}

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
        <SessionFormLink programId={program.programId}>
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </SessionFormLink>
      </HeaderRightContainer>

      <View style={tw`flex flex-col`}>
        <NavigationLink
          screen="ProgramFormModal"
          navigationParams={{ programId: program.programId }}
        >
          <CardInfo
            style={tw`rounded-t-xl border-b-2`}
            primaryText={program.name}
            specialText="Edit"
          />
        </NavigationLink>
        <CardInfo style={tw`rounded-b-xl mb-9`} specialText="Explore Data" reverse />
        {(!sections || sections.length === 0 || sections[0].title.includes('TODAY')) && (
          <SectionList
            style={tw`mb-9`}
            sections={[{ title: formatDate(new Date()), data: [{ name: 'foo' }] }]}
            keyExtractor={(item, index) => `${index}`}
            renderItem={({ index, section }) => (
              <SessionFormLink programId={program.programId}>
                <CardInfo
                  style={tw.style(
                    'border-b-2',
                    index === 0 ? 'rounded-t-xl' : undefined,
                    index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
                  )}
                  specialText="Plan Workout Session"
                  reverse
                />
              </SessionFormLink>
            )}
            renderSectionHeader={({ section: { title } }) => (
              <SecondaryText style={tw`pl-4 pb-1.5 uppercase text-sm`}>{title}</SecondaryText>
            )}
          />
        )}
        {sections && sections.length > 0 && (
          <SectionList
            style={tw`mb-64`}
            sections={sections}
            keyExtractor={session => (session as Session).sessionId}
            renderSectionHeader={({ section: { title } }) => (
              <SecondaryText style={tw`pl-4 pb-1.5 uppercase text-sm`}>{title}</SecondaryText>
            )}
            renderItem={({ index, item, section }) => (
              <NavigationLink
                style={tw``}
                navigationParams={{
                  programId: program.programId,
                  sessionId: (item as Session).sessionId
                }}
                screen="SessionDetailScreen"
              >
                <CardInfo
                  style={tw.style(
                    'border-b-2',
                    index === 0 ? 'rounded-t-xl' : undefined,
                    index === section.data.length - 1 ? 'rounded-b-xl border-b-0 mb-9' : undefined
                  )}
                  primaryText={(item as Session).name}
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
