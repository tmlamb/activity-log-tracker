import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import WorkoutSetDetail from '../WorkoutSetDetail'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

function WorkoutSetDetailScreen({
  route: { params },
  navigation: { goBack, navigate }
}: RootStackScreenProps<'WorkoutSetDetailScreen'>) {
  const { programs, exercises, updateWorkoutSet, startSession } = useWorkoutStore(store => store)
  const program = _.find(programs, { programId: params.programId })

  if (!program) {
    navigate('NotFoundScreen')
    return null
  }

  const session = _.find(program.sessions, { sessionId: params.sessionId })

  if (!session) {
    navigate('NotFoundScreen')
    return null
  }

  const activity = _.find(session.activities, { activityId: params.activityId })

  if (!activity) {
    navigate('NotFoundScreen')
    return null
  }

  const exercise = _.find(exercises, { exerciseId: activity.exerciseId })

  if (!exercise) {
    navigate('NotFoundScreen')
    return null
  }

  const workoutSet =
    _.find(activity.mainSets, { workoutSetId: params.workoutSetId }) ||
    _.find(activity.warmupSets, { workoutSetId: params.workoutSetId })

  if (!workoutSet) {
    navigate('NotFoundScreen')
    return null
  }

  return (
    <ScreenLayout>
      <WorkoutSetDetail
        session={session}
        program={program}
        activity={activity}
        workoutSet={workoutSet}
        exercise={exercise}
        updateWorkoutSet={updateWorkoutSet}
        startSession={startSession}
        goBack={goBack}
      />
    </ScreenLayout>
  )
}

export default WorkoutSetDetailScreen
