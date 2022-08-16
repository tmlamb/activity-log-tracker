import { AntDesign } from '@expo/vector-icons'
import { differenceInCalendarDays } from 'date-fns'
import _ from 'lodash'
import React from 'react'
import { SectionList } from 'react-native'
import tw from '../tailwind'
import { Program, Session } from '../types'
import { normalizedLocalDate, weekAndDayFromStart } from '../utils'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

type Props = {
  program: Program
}

export default function ProgramDetail({ program }: Props) {
  // Grouping sessions by date in 'Week x Day y' format for the section list.
  const orderedByStart = _.orderBy(program.sessions, ['start'], ['asc'])
  const programStart = orderedByStart[0]?.start || new Date() // The first session is considered the program start
  const sections: { title: string; data: (Session | undefined)[] }[] = _(orderedByStart)
    .groupBy(session => {
      const sessionStart = session.start || new Date()
      return weekAndDayFromStart(programStart, sessionStart)
    })
    .map((data, title) => ({ title, data }))
    .value()
  if (
    sections.length > 0 &&
    differenceInCalendarDays(
      normalizedLocalDate(new Date()),
      normalizedLocalDate(sections?.[sections.length - 1]?.data?.[0]?.start || new Date())
    ) === 0
  ) {
    sections[sections.length - 1].title += ' (Today)'
  } else {
    sections.push({
      title: `${weekAndDayFromStart(programStart, new Date())} (Today)`,
      data: [undefined]
    })
  }
  sections.reverse() // Reverse to show most recent at the top.

  return (
    <SectionList
      style={tw`flex-1`}
      contentContainerStyle={tw`px-3 pt-9 pb-12`}
      scrollEnabled={program.sessions.length > 4}
      sections={sections}
      keyExtractor={(session, index) => (session ? (session as Session).sessionId : String(index))}
      ListHeaderComponent={
        <>
          <ThemedView rounded>
            <PrimaryText style={tw`pr-2`}>Program</PrimaryText>
            <SecondaryText style={tw`flex-1 text-right`} numberOfLines={1}>
              {program.name}
            </SecondaryText>
          </ThemedView>
          <PrimaryText style={tw`font-semibold text-xl mt-9 ml-1.5 mb-2.5`}>
            Workout Sessions
          </PrimaryText>
        </>
      }
      renderSectionHeader={({ section: { title } }) => (
        <SecondaryText style={tw`ml-3 mb-1.5 uppercase text-sm`}>{title}</SecondaryText>
      )}
      renderItem={({ index, item, section }) => (
        <>
          {!item && (
            <>
              <LinkButton
                style={tw`mb-6`}
                to={{ screen: 'SessionFormModal', params: { programId: program.programId } }}
                accessibilityLabel={`Navigate to create new workout session form under workout program ${program.name}`}
              >
                <ThemedView rounded>
                  <SpecialText>Plan Workout Session</SpecialText>
                </ThemedView>
              </LinkButton>
              {program.sessions.length < 1 && (
                <SecondaryText style={tw`ml-3 -mt-[18px] text-xs`}>
                  Start tracking your exercises by planning a session.
                </SecondaryText>
              )}
            </>
          )}
          {item && (
            <LinkButton
              to={{
                screen: 'SessionDetailScreen',
                params: {
                  programId: program.programId,
                  sessionId: item.sessionId
                }
              }}
              accessibilityLabel={`Navigate to workout session ${item.name} with status ${item.status}`}
            >
              <ThemedView
                style={tw.style(
                  'border-b-2',
                  index === 0 ? 'rounded-t-xl' : undefined,
                  index === section.data.length - 1 && !section.title.includes('Today')
                    ? 'rounded-b-xl border-b-0 mb-6'
                    : undefined
                )}
              >
                <PrimaryText style={tw`flex-1`} numberOfLines={1}>
                  {item.name}
                </PrimaryText>
                {(item.status === 'Ready' && (
                  <SpecialText style={tw`pr-5`}>{item.status}</SpecialText>
                )) || <SecondaryText style={tw`pr-5`}>{item.status}</SecondaryText>}
                <SecondaryText style={tw`absolute right-2`}>
                  <AntDesign name="right" size={16} />
                </SecondaryText>
              </ThemedView>
            </LinkButton>
          )}
          {section.title.includes('Today') && index === section.data.length - 1 && item && (
            <LinkButton
              to={{
                screen: 'SessionFormModal',
                params: { programId: program.programId }
              }}
              style={tw`mb-6`}
              accessibilityLabel={`Navigate to create new workout session form under workout program ${program.name}`}
            >
              <ThemedView style={tw`rounded-b-xl`}>
                <SpecialText>Plan Workout Session</SpecialText>
              </ThemedView>
            </LinkButton>
          )}
        </>
      )}
    />
  )
}
