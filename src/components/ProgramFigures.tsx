import _ from 'lodash'
import React from 'react'
import { ScrollView } from 'react-native'
import tw from '../tailwind'
import { Exercise, Program } from '../types'
import CardInfo from './CardInfo'

type Props = {
  program: Program
  exercises: Exercise[]
}

export default function ProgramFigures({ program, exercises }: Props) {
  const usedExercises = _.reduce(
    program.sessions,
    (exs, session) =>
      _.concat(
        exs,
        _.reduce(
          session.activities,
          (es, activity) => {
            const ex: Exercise | undefined = _.find(exercises, { exerciseId: activity.exerciseId })
            return ex ? _.concat(es, ex) : es
          },
          [] as Exercise[]
        )
      ),
    [] as Exercise[]
  )

  return (
    <ScrollView style={tw`px-3`} contentContainerStyle={tw`pb-48 mt-9`}>
      <CardInfo
        style={tw`border-b-2 rounded-t-xl`}
        primaryText="Program"
        secondaryText={program.name}
      />
      <CardInfo
        style={tw`rounded-b-xl`}
        primaryText="Sessions Completed"
        secondaryText={String(
          program.sessions.filter(session => session.status === 'Done').length || 0
        )}
      />
    </ScrollView>
  )
}
