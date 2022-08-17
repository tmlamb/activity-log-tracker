import _ from 'lodash'
import React from 'react'
import useWorkoutStore from '../../hooks/use-workout-store'
import ProgramDetail from '../ProgramDetail'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function ProgramDetailScreen({
  route: { params }
}: RootStackScreenProps<'ProgramDetailScreen'>) {
  const programs = useWorkoutStore(state => state.programs)
  const program = _.find(programs, { programId: params.programId })

  console.log(params)
  console.log(programs)

  if (!program) {
    throw Error(`Possible data corruption: unable to find program ${params.programId}`)
  }

  return (
    <ScreenLayout>
      <ProgramDetail program={program} />
    </ScreenLayout>
  )
}
