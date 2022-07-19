import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { SectionList, View } from 'react-native'
import tw from '../tailwind'
import { Program, Session } from '../types'
import { formatDateByProgramWeek, mapSessionsByDate } from '../utils'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText } from './Typography'

type Props = {
  program: Program
}

export function SessionFormLink({
  programId,
  sessionId
}: {
  programId: string
  sessionId?: string
}) {
  return (
    <LinkButton to={{ screen: 'SessionFormModal', params: { programId, sessionId } }}>
      <CardInfo
        style={tw.style('rounded-b-xl mb-6')}
        leftIcon={
          <SpecialText style={tw``}>
            <AntDesign style={tw``} name="pluscircle" size={16} />
            &nbsp;&nbsp;Plan Workout Session
          </SpecialText>
        }
        specialText=" "
        textStyle={tw``}
      />
    </LinkButton>
  )
}
SessionFormLink.defaultProps = {
  sessionId: undefined
}

export default function ProgramDetail({ program }: Props) {
  // We need to show the list of workout sessions grouped by date, so we first
  // convert the array of programs into a map where the key is the program date
  // and the value is the array of sessions for that date. The date key format
  // callback will use 'Today' if the date is today, otherwise it will use the
  // number of weeks and days since the first session, e.g. 'Week 2, Day 4'.
  const sessions = mapSessionsByDate(program.sessions, program, formatDateByProgramWeek)
  // The SectionList component expects an array of objects with a 'title' and
  // 'data' property. The 'title' property will be used as the section header
  // and the 'data' property will be used as the list of items in that section.
  const sections = Array.from(sessions, ([title, data]: [string, (Session | undefined)[]]) => ({
    title,
    data
  }))

  // Add a section for 'Today' if there wasn't already a workout planned for today.
  if (!sections[0] || !sections[sections.length - 1].title.includes('Today')) {
    sections.push({
      title: formatDateByProgramWeek(new Date(), program),
      data: [undefined]
    })
  }

  sections.reverse() // Reverse to show most recent at the top.

  return (
    <>
      <HeaderRightContainer>
        {/* <LinkButton to={{ screen: 'ProgramFiguresScreen' }} style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}> */}
        <SpecialText style={tw`py-6 pl-8 pr-3 -my-6 -mr-2`}>
          <AntDesign name="linechart" size={22} />
        </SpecialText>
        {/* </LinkButton> */}
      </HeaderRightContainer>
      <View style={tw``}>
        {sections && sections.length > 0 && (
          <SectionList
            style={tw`flex-grow pt-9 px-3`}
            contentContainerStyle={tw`pb-36`}
            sections={sections}
            keyExtractor={(session, index) =>
              session ? (session as Session).sessionId : String(index)
            }
            ListHeaderComponent={
              <>
                <CardInfo
                  style={tw`rounded-xl`}
                  primaryText="Program"
                  secondaryText={program.name}
                />
                <PrimaryText style={tw`font-semibold text-xl mt-9 ml-1.5 mb-2.5`}>
                  Workout Sessions
                </PrimaryText>
              </>
            }
            renderSectionHeader={({ section: { title } }) => (
              <SecondaryText style={tw`pl-3 pb-1.5 uppercase text-sm`}>{title}</SecondaryText>
            )}
            renderItem={({ index, item, section }) => (
              <>
                {!item && (
                  <>
                    <LinkButton
                      to={{ screen: 'SessionFormModal', params: { programId: program.programId } }}
                    >
                      <CardInfo
                        style={tw.style('rounded-xl mb-6')}
                        specialText="Plan Workout Session"
                        textStyle={tw``}
                        reverse
                      />
                    </LinkButton>
                    {program.sessions.length < 1 && (
                      <SecondaryText style={tw`pl-3 -mt-4 text-xs`}>
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
                  >
                    <CardInfo
                      style={tw.style(
                        'border-b-2',
                        index === 0 ? 'rounded-t-xl' : undefined,
                        index === section.data.length - 1 && !section.title.includes('Today')
                          ? 'rounded-b-xl border-b-0 mb-6'
                          : undefined
                      )}
                      primaryText={item.name}
                      centeredText={
                        item.start && item.end
                          ? `${Math.ceil(
                              (item.end.getTime() - item.start.getTime()) / 1000 / 60
                            )} min`
                          : undefined
                      }
                      secondaryText={
                        // eslint-disable-next-line no-nested-ternary
                        ['Planned', 'Done'].includes(item.status) ? item.status : undefined
                      }
                      specialText={item.status === 'Ready' ? item.status : undefined}
                      rightIcon={
                        <SecondaryText>
                          <AntDesign name="right" size={16} />
                        </SecondaryText>
                      }
                    />
                  </LinkButton>
                )}
                {section.title.includes('Today') && index === section.data.length - 1 && item && (
                  <LinkButton
                    to={{
                      screen: 'SessionFormModal',
                      params: { programId: program.programId }
                    }}
                  >
                    <CardInfo
                      style={tw.style('rounded-b-xl mb-6')}
                      specialText="Plan Workout Session"
                      textStyle={tw``}
                      reverse
                    />
                  </LinkButton>
                )}
              </>
            )}
          />
        )}
      </View>
    </>
  )
}
