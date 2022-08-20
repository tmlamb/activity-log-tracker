import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import { Session } from '../../types'
import SessionSelect from '../SessionSelect'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function SessionSelectModal({
  route: { params },
  navigation: { goBack, navigate }
}: RootStackScreenProps<'SessionSelectModal'>) {
  const { programs } = useWorkoutStore(state => state)
  const { value, programId, parentScreen, parentParams, modalSelectId } = params
  const program = _.find(programs, { programId })

  if (!program) {
    navigate('NotFoundScreen')
    return null
  }
  const sessions = program?.sessions

  return (
    <ModalLayout>
      <SessionSelect
        session={value as Session}
        sessions={sessions}
        parentScreen={parentScreen}
        parentParams={parentParams}
        modalSelectId={modalSelectId}
        goBack={goBack}
      />
    </ModalLayout>
  )
}
