import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import SessionForm from '../SessionForm'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps, SessionFormNavParams } from './types'

export default function SessionFormModal({
  route,
  navigation: { goBack, navigate }
}: RootStackScreenProps<'SessionFormModal'>) {
  const { programs, exercises, addSession, updateSession, deleteSession } = useWorkoutStore(
    store => store
  )

  // TODO: improve navigation prop typing to avoid forced casts
  const params = route.params as Readonly<SessionFormNavParams>

  const program = _.find(programs, { programId: params.programId })

  if (!program) {
    navigate('NotFoundScreen')
    return null
  }

  const { sessions } = program
  const session = _.find(sessions, { sessionId: params.sessionId })

  if (!session && params?.sessionId) {
    navigate('NotFoundScreen')
    return null
  }

  return (
    <ModalLayout>
      {session ? (
        <SessionForm
          changeHandler={updateSession}
          program={program}
          session={session}
          sessions={sessions}
          exercises={exercises}
          deleteHandler={deleteSession}
          goBack={goBack}
        />
      ) : (
        <SessionForm
          program={program}
          sessions={sessions}
          exercises={exercises}
          changeHandler={addSession}
          goBack={goBack}
        />
      )}
    </ModalLayout>
  )
}
