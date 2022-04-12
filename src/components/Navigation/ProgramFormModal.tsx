import React from 'react'
import { useProgramState } from '../../context/ProgramState'
import { ProgramForm } from '../ProgramForm'
import ModalLayout from './ModalLayout'

export default function ProgramFormModal() {
  const { addProgram } = useProgramState()

  return (
    <ModalLayout>
      <ProgramForm addProgramHandler={addProgram} />
    </ModalLayout>
  )
}
