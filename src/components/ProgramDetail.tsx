import { AntDesign } from '@expo/vector-icons'
import { differenceInCalendarDays } from 'date-fns'
import Constants from 'expo-constants'
import _ from 'lodash'
import React from 'react'
import { Platform, SectionList } from 'react-native'
import tw from '../tailwind'
import { Program, Session } from '../types'
import { normalizedLocalDate, weekAndDayFromStart } from '../utils'
import ButtonContainer from './ButtonContainer'
import HeaderLeftContainer from './HeaderLeftContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

type Props = {
  program: Program
  goBack: () => void
}
const { sentryPublicDsn } = Constants.expoConfig?.extra || {}

export default function ProgramDetail({ program, goBack }: Props) {
  // First order the sessions by start date, with most recent first:
  const orderedByStart = _.orderBy(program.sessions, ['start'], ['asc'])

  // The first session's start date is considered the program start date
  const programStart = orderedByStart[0]?.start || new Date()

  const sections: { title: string; data: (Session | undefined)[] }[] = _(orderedByStart)
    // Group by the session start date, using the 'Week # Day #' format as the key
    .groupBy(session => {
      const sessionStart = session.start || new Date()
      return weekAndDayFromStart(programStart, sessionStart)
    })
    // Map each grouping to the format required by the SectionList
    .map((data, title) => ({ title, data }))
    .value()

  // If the last (most recent) section falls on today's date, add 'Today' to the title
  // Otherwise, create an empty section for today's date where the 'Plan Workout Session'
  // button can be placed.
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

  // Reverse to show most recent at the top.
  sections.reverse()

  return (
    <>
      {Platform.OS === 'web' && (
        <HeaderLeftContainer>
          <ButtonContainer onPress={goBack}>
            <SpecialText>Back</SpecialText>
          </ButtonContainer>
        </HeaderLeftContainer>
      )}
      <SectionList
        style={tw`flex-1`}
        contentContainerStyle={tw`px-3 pt-9 pb-12`}
        scrollEnabled={program.sessions.length > 4}
        sections={sections}
        keyExtractor={(session, index) =>
          session ? (session as Session).sessionId : String(index)
        }
        ListHeaderComponent={
          <>
            <ThemedView rounded>
              <PrimaryText style={tw`pr-2`}>Program</PrimaryText>
              <SecondaryText style={tw`flex-1 text-right`} numberOfLines={1}>
                {program.name}
              </SecondaryText>
            </ThemedView>
            <PrimaryText style={tw`font-semibold text-xl mt-9 ml-1.5 mb-2.5`}>
              {sentryPublicDsn}
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
                  <SecondaryText style={tw`ml-3 -mt-[18px] text-sm`}>
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
    </>
  )
}
