import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { View } from 'react-native'
import { useProgramState } from '../../context/ProgramState'
import { StackParamList } from '../../types'
import SessionDetail from '../SessionDetail'
import ScreenLayout from './ScreenLayout'

type Props = NativeStackScreenProps<StackParamList, 'SessionDetailScreen'>
export type SessionNavigationProp = Props['navigation']

function SessionDetailScreen({ route }: Props) {
  const { programs, exercises } = useProgramState()
  const program = programs.find(p => p.programId === route.params.programId)
  const session = program?.sessions.find(s => s.sessionId === route.params.sessionId)

  return (
    <ScreenLayout>
      <View>
        {session && <SessionDetail session={session} program={program!} exercises={exercises} />}
      </View>
    </ScreenLayout>
  )
}

export default SessionDetailScreen
