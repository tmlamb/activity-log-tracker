import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useProgramState } from '../../context/ProgramState'
import { StackParamList } from '../../types'
import ProgramForm from '../ProgramForm'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'ProgramFormModal'>
export type ProgramFormNavigationProp = Props['navigation']

export default function ProgramFormModal({ route }: Props) {
  const { programs, addProgram, updateProgram } = useProgramState()
  const program = route.params
    ? programs.find(p => p.entityId === route.params?.entityId)
    : undefined

  return (
    <ModalLayout>
      {program ? (
        <ProgramForm changeHandler={updateProgram} program={program} />
      ) : (
        <ProgramForm changeHandler={addProgram} />
      )}
    </ModalLayout>
  )
}

// type Props = NativeStackScreenProps<StackParamList, 'ProgramDetailScreen'>
// export type ProgramNavigationProp = Props['navigation']

// export default function ProgramDetailScreen({ route }: Props) {
//   const { programs } = useProgramState()
//   const program = programs.find(p => p.entityId === route.params.entityId)
//   return (
//     <ScreenLayout>
//       <View>{program && <ProgramDetail program={program} />}</View>
//     </ScreenLayout>
//   )
// }
