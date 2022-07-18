import React from 'react'
import { View } from 'react-native'
import useWorkoutStore from '../../hooks/use-workout-store'
import SessionDetail from '../SessionDetail'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function SessionDetailScreen({
  route
}: RootStackScreenProps<'SessionDetailScreen'>) {
  const programs = useWorkoutStore(state => state.programs)
  const exercises = useWorkoutStore(state => state.exercises)
  const program = programs.find(p => p.programId === route.params.programId)
  const session = program?.sessions.find(s => s.sessionId === route.params.sessionId)
  const updateSession = useWorkoutStore(store => store.updateSession)

  return (
    <ScreenLayout>
      <View>
        {session && (
          <SessionDetail
            session={session}
            program={program!}
            exercises={exercises}
            changeHandler={updateSession}
          />
        )}
      </View>
    </ScreenLayout>
  )
}
