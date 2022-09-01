import { differenceInCalendarDays } from 'date-fns'
import _ from 'lodash'
import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { Program, Session } from '../types'
import { normalizedLocalDate, weekAndDayFromStart } from '../utils'
import ButtonContainer from './ButtonContainer'
import HeaderLeftContainer from './HeaderLeftContainer'
import { SpecialText } from './Themed'

type Props = {
  program: Program
  goBack: () => void
}

export default function ProgramData({ program, goBack }: Props) {
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

  return (
    <>
      {Platform.OS === 'web' && (
        <HeaderLeftContainer>
          <ButtonContainer onPress={goBack}>
            <SpecialText>Back</SpecialText>
          </ButtonContainer>
        </HeaderLeftContainer>
      )}
      <Svg style={StyleSheet.absoluteFill}>
        <Line
          x1={0}
          y1={0}
          x2={100}
          y2={100}
          strokeWidth={2}
          stroke="#B5B6B7"
          strokeDasharray="6 6"
        />
      </Svg>
    </>
  )
}
