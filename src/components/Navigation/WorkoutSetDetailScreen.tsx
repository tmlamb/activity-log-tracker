import _ from 'lodash'
import React from 'react'
import { View } from 'react-native'
import useWorkoutStore from '../../hooks/use-workout-store'
import WorkoutSetDetail from '../WorkoutSetDetail'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

function WorkoutSetDetailScreen({
  route: { params }
}: RootStackScreenProps<'WorkoutSetDetailScreen'>) {
  const { programs, exercises, updateWorkoutSet, updateSession } = useWorkoutStore(store => store)
  const program = _.find(programs, { programId: params.programId })

  if (!program) {
    throw Error(`Possible data corruption: unable to find program ${params.programId}`)
  }

  const session = _.find(program.sessions, { sessionId: params.sessionId })

  if (!session) {
    throw Error(`Possible data corruption: unable to find session ${params.sessionId}`)
  }

  const activity = _.find(session.activities, { activityId: params.activityId })

  if (!activity) {
    throw Error(`Possible data corruption: unable to find activity ${params.activityId}`)
  }

  const exercise = _.find(exercises, { exerciseId: activity.exerciseId })

  if (!exercise) {
    throw Error(`Possible data corruption: unable to find exercise ${activity.exerciseId}`)
  }

  const workoutSet =
    _.find(activity.mainSets, { workoutSetId: params.workoutSetId }) ||
    _.find(activity.warmupSets, { workoutSetId: params.workoutSetId })

  if (!workoutSet) {
    throw Error(`Possible data corruption: unable to find workoutSet ${params.workoutSetId}`)
  }

  return (
    <ScreenLayout>
      <View>
        {session && (
          <WorkoutSetDetail
            session={session}
            program={program}
            activity={activity}
            workoutSet={workoutSet}
            exercise={exercise}
            updateWorkoutSet={updateWorkoutSet}
            updateSession={updateSession}
          />
        )}
      </View>
    </ScreenLayout>
  )
}

export default WorkoutSetDetailScreen
