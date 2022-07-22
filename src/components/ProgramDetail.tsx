import { AntDesign } from '@expo/vector-icons'
import _ from 'lodash'
import React from 'react'
import { SectionList } from 'react-native'
import tw from '../tailwind'
import { Program, Session } from '../types'
import { formatWeekAndDayKey } from '../utils'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText } from './Typography'

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
      return formatWeekAndDayKey(programStart, sessionStart)
    })
    .map((data, title) => ({ title, data }))
    .value()

  // Add a section for 'Today' if there wasn't already a workout planned for today.
  if (!sections[0] || !sections[sections.length - 1].title.includes('Today')) {
    sections.push({
      title: formatWeekAndDayKey(programStart, new Date()),
      data: [undefined]
    })
  }

  sections.reverse() // Reverse to show most recent at the top.

  return (
    <>
      <HeaderRightContainer>
        <LinkButton
          to={{ screen: 'ProgramFiguresScreen', params: { programId: program.programId } }}
          style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}
        >
          <SpecialText style={tw`py-6 pl-8 pr-3 -my-6 -mr-2`}>
            <AntDesign name="linechart" size={22} />
          </SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      {sections && sections.length > 0 && (
        <SectionList
          style={tw`flex-grow pt-9 px-3`}
          contentContainerStyle={tw`pb-48`}
          sections={sections}
          keyExtractor={(session, index) =>
            session ? (session as Session).sessionId : String(index)
          }
          ListHeaderComponent={
            <>
              <CardInfo style={tw`rounded-xl`} primaryText="Program" secondaryText={program.name} />
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
    </>
  )
}
