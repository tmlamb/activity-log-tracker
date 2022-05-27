import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import { StackParamList } from '../../types'
import ProgramForm from '../ProgramForm'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'ProgramFormModal'>
export type ProgramFormNavigationProp = Props['navigation']

export default function ProgramFormModal({ route }: Props) {
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
