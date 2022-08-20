import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import SessionDetail from '../SessionDetail'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function SessionDetailScreen({
  route: { params },
  navigation: { goBack, navigate }
}: RootStackScreenProps<'SessionDetailScreen'>) {
  const { programs, exercises, updateSession } = useWorkoutStore(store => store)
  const program = _.find(programs, { programId: params.programId })

  if (!program) {
    navigate('NotFoundScreen')
    return null
  }

  const session = _.find(program.sessions, { sessionId: params.sessionId })

  if (!session) {
    navigate('NotFoundScreen')
    return null
  }

  return (
    <ScreenLayout>
      <SessionDetail
        session={session}
        program={program}
        exercises={exercises}
        changeHandler={updateSession}
        goBack={goBack}
      />
    </ScreenLayout>
  )
}
