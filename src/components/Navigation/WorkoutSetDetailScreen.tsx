import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { View } from 'react-native'
import { useProgramState } from '../../context/ProgramState'
import { StackParamList } from '../../types'
import WorkoutSetDetail from '../WorkoutSetDetail'
import ScreenLayout from './ScreenLayout'

type Props = NativeStackScreenProps<StackParamList, 'WorkoutSetDetailScreen'>
export type WorkoutSetNavigationProp = Props['navigation']

function WorkoutSetDetailScreen({ route }: Props) {
  const { programs, exercises, updateWorkoutSet } = useProgramState()
  const program = programs.find(p => p.programId === route.params.programId)
  const session = program?.sessions.find(s => s.sessionId === route.params.sessionId)
  const activity = session?.activities.find(a => a.activityId === route.params.activityId)
  const workoutSet =
    activity?.workSets.find(ws => ws.workoutSetId === route.params.workoutSetId) ||
    activity?.warmupSets.find(ws => ws.workoutSetId === route.params.workoutSetId)

  return (
    <ScreenLayout>
      <View>
        {session && (
          <WorkoutSetDetail
            session={session}
            program={program!}
            activity={activity!}
            workoutSet={workoutSet!}
            exercises={exercises}
            updateWorkoutSet={updateWorkoutSet}
          />
        )}
      </View>
    </ScreenLayout>
  )
}

export default WorkoutSetDetailScreen
