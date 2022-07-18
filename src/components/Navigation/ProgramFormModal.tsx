import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import ProgramForm from '../ProgramForm'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

export default function ProgramFormModal({ route }: RootStackScreenProps<'ProgramFormModal'>) {
  const programs = useWorkoutStore(state => state.programs)
  const addProgram = useWorkoutStore(state => state.addProgram)
  const updateProgram = useWorkoutStore(state => state.updateProgram)
  const deleteProgram = useWorkoutStore(state => state.deleteProgram)

  const program = route.params
    ? programs.find(p => p.programId === route.params?.programId)
    : undefined

  return (
    <ModalLayout>
      {program ? (
        <ProgramForm
          changeHandler={updateProgram}
          program={program}
          deleteHandler={deleteProgram}
        />
      ) : (
        <ProgramForm changeHandler={addProgram} />
      )}
    </ModalLayout>
  )
}
