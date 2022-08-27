import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import ProgramData from '../ProgramData'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function ProgramDetailScreen({
  route: { params },
  navigation: { goBack, navigate }
}: RootStackScreenProps<'ProgramDetailScreen'>) {
  const programs = useWorkoutStore(state => state.programs)
  const program = _.find(programs, { programId: params.programId })

  if (!program) {
    navigate('NotFoundScreen')
    return null
  }

  return (
    <ScreenLayout>
      <ProgramData program={program} goBack={goBack} />
    </ScreenLayout>
  )
}
