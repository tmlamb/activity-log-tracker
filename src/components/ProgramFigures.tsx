import _ from 'lodash'
import React from 'react'
import { ScrollView } from 'react-native'
import tw from '../tailwind'
import { Exercise, Program } from '../types'
import { PrimaryText, SecondaryText, ThemedView } from './Themed'

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
    <ScrollView contentContainerStyle={tw`px-3 pb-48 mt-9`}>
      <ThemedView style={tw`border-b-2 rounded-t-xl`}>
        <PrimaryText>Program</PrimaryText>
        <SecondaryText>{program.name}</SecondaryText>
      </ThemedView>
      <ThemedView style={tw`rounded-b-xl`}>
        <PrimaryText>Session Completed</PrimaryText>
        <SecondaryText>
          {String(program.sessions.filter(session => session.status === 'Done').length || 0)}
        </SecondaryText>
      </ThemedView>
    </ScrollView>
  )
}
