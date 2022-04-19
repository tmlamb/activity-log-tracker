import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useProgramState } from '../../context/ProgramState'
import { StackParamList } from '../../types'
import SessionForm from '../SessionForm'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'SessionFormModal'>
export type SessionFormNavigationProp = Props['navigation']

export default function SessionFormModal({ route }: Props) {
  const { programs, addSession, updateSession, deleteSession } = useProgramState()
  const session = route.params
    ? programs
        .find(p => p.programId === route.params?.programId)
        ?.sessions.find(s => s.sessionId === route.params?.sessionId)
    : undefined
  // const { load, activityId } = route.params.newLoad
  //   ? route.params.newLoad
  //   : { load: undefined, activityId: undefined }

  return (
    <ModalLayout>
      {session ? (
        <SessionForm
          changeHandler={updateSession}
          programId={route.params?.programId}
          session={session}
          deleteHandler={deleteSession}
        />
      ) : (
        <SessionForm programId={route.params?.programId} changeHandler={addSession} />
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
