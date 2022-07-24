import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import { Session } from '../../types'
import SessionSelect from '../SessionSelect'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function SessionSelectModal({
  route: { params },
  navigation: { goBack }
}: RootStackScreenProps<'SessionSelectModal'>) {
  const { programs } = useWorkoutStore(state => state)
  const { value, programId, parentScreen, parentParams, modalSelectId } = params
  const program = _.find(programs, { programId })
  const sessions = program?.sessions

  if (!program) {
    throw Error(`Possible data corruption: unable to find program ${params.programId}`)
  }

  return (
    <ModalLayout>
      <SessionSelect
        session={value as Session}
        sessions={sessions}
        program={program}
        parentScreen={parentScreen}
        parentParams={parentParams}
        modalSelectId={modalSelectId}
        goBack={goBack}
      />
    </ModalLayout>
  )
}
