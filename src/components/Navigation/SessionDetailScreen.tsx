import _ from 'lodash'
import React from 'react'
import { View } from 'react-native'
import useWorkoutStore from '../../hooks/use-workout-store'
import SessionDetail from '../SessionDetail'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function SessionDetailScreen({
  route: { params }
}: RootStackScreenProps<'SessionDetailScreen'>) {
  const { programs, exercises, updateSession } = useWorkoutStore(store => store)
  const program = _.find(programs, { programId: params.programId })

  if (!program) {
    throw Error(`Possible data corruption: unable to find program ${params.programId}`)
  }

  const session = _.find(program.sessions, { sessionId: params.sessionId })

  return (
    <ScreenLayout>
      <View>
        {session && (
          <SessionDetail
            session={session}
            program={program}
            exercises={exercises}
            changeHandler={updateSession}
          />
        )}
      </View>
    </ScreenLayout>
  )
}
