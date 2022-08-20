import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import ProgramForm from '../ProgramForm'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function ProgramFormModal({
  route: { params },
  navigation: { goBack, navigate }
}: RootStackScreenProps<'ProgramFormModal'>) {
  const { programs, addProgram, updateProgram, deleteProgram } = useWorkoutStore(state => state)

  const program = _.find(programs, { programId: params?.programId })

  if (!program && params?.programId) {
    navigate('NotFoundScreen')
    return null
  }

  return (
    <ModalLayout>
      {program ? (
        <ProgramForm
          changeHandler={updateProgram}
          program={program}
          deleteHandler={deleteProgram}
          goBack={goBack}
        />
      ) : (
        <ProgramForm changeHandler={addProgram} goBack={goBack} />
      )}
    </ModalLayout>
  )
}
