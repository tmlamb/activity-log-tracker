import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import { Session } from '../../types'
import SessionSelect from '../SessionSelect'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function SessionSelectModal({ route }: RootStackScreenProps<'SessionSelectModal'>) {
  const { programs } = useWorkoutStore(state => state)
  const { value, programId, parentScreen, parentParams, modalSelectId } = route.params
  const program = programs.find(p => p.programId === programId)
  const sessions = program?.sessions

  return (
    <ModalLayout>
      <SessionSelect
        session={value as Session}
        sessions={sessions}
        program={program!}
        parentScreen={parentScreen}
        parentParams={parentParams}
        modalSelectId={modalSelectId}
      />
    </ModalLayout>
  )
}
