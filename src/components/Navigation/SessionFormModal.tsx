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
  const program = programs.find(p => p.programId === params?.programId)
  const { sessions } = program!
  const session = sessions?.find(s => s.sessionId === params?.sessionId)

  return (
    <ModalLayout>
      {session ? (
        <SessionForm
          changeHandler={updateSession}
          programId={params?.programId}
          session={session}
          sessions={sessions}
          exercises={exercises}
          deleteHandler={deleteSession}
        />
      ) : (
        <SessionForm
          programId={params?.programId}
          sessions={sessions}
          exercises={exercises}
          changeHandler={addSession}
        />
      )}
    </ModalLayout>
  )
}
