import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { View } from 'react-native'
import useWorkoutStore from '../../hooks/use-workout-store'
import { StackParamList } from '../../types'
import WorkoutSetDetail from '../WorkoutSetDetail'
import ScreenLayout from './ScreenLayout'

type Props = NativeStackScreenProps<StackParamList, 'WorkoutSetDetailScreen'>
export type WorkoutSetNavigationProp = Props['navigation']

function WorkoutSetDetailScreen({ route }: Props) {
  const programs = useWorkoutStore(store => store.programs)
  const exercises = useWorkoutStore(store => store.exercises)
  const updateWorkoutSet = useWorkoutStore(store => store.updateWorkoutSet)

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
