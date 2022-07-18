import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import SessionForm from '../SessionForm'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps, SessionFormNavParams } from './types'

export default function SessionFormModal({ route }: RootStackScreenProps<'SessionFormModal'>) {
  const programs = useWorkoutStore(store => store.programs)
  const exercises = useWorkoutStore(store => store.exercises)
  const addSession = useWorkoutStore(store => store.addSession)
  const updateSession = useWorkoutStore(store => store.updateSession)
  const deleteSession = useWorkoutStore(store => store.deleteSession)

  const params = route.params as Readonly<SessionFormNavParams>
  const session = params
    ? programs
        .find(p => p.programId === params?.programId)
        ?.sessions.find(s => s.sessionId === params?.sessionId)
    : undefined

  return (
    <ModalLayout>
      {session ? (
        <SessionForm
          changeHandler={updateSession}
          programId={params?.programId}
          session={session}
          exercises={exercises}
          deleteHandler={deleteSession}
        />
      ) : (
        <SessionForm
          programId={params?.programId}
          exercises={exercises}
          changeHandler={addSession}
        />
      )}
    </ModalLayout>
  )
}
