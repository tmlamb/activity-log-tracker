import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { View } from 'react-native'
import useWorkoutStore from '../../hooks/use-workout-store'
import { StackParamList } from '../../types'
import SessionDetail from '../SessionDetail'
import ScreenLayout from './ScreenLayout'

type Props = NativeStackScreenProps<StackParamList, 'SessionDetailScreen'>
export type SessionNavigationProp = Props['navigation']

function SessionDetailScreen({ route }: Props) {
  const programs = useWorkoutStore(state => state.programs)
  const exercises = useWorkoutStore(state => state.exercises)
  const program = programs.find(p => p.programId === route.params.programId)
  const session = program?.sessions.find(s => s.sessionId === route.params.sessionId)
  const updateSession = useWorkoutStore(store => store.updateSession)
  const updateWorkoutSet = useWorkoutStore(store => store.updateWorkoutSet)

  return (
    <ScreenLayout>
      <View>
        {session && (
          <SessionDetail
            session={session}
            program={program!}
            exercises={exercises}
            changeHandler={updateSession}
            updateWorkoutSet={updateWorkoutSet}
          />
        )}
      </View>
    </ScreenLayout>
  )
}

export default SessionDetailScreen
