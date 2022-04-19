import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useProgramState } from '../../context/ProgramState'
import { StackParamList } from '../../types'
import ProgramForm from '../ProgramForm'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'ProgramFormModal'>
export type ProgramFormNavigationProp = Props['navigation']

export default function ProgramFormModal({ route }: Props) {
  const { programs, addProgram, updateProgram, deleteProgram } = useProgramState()
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
