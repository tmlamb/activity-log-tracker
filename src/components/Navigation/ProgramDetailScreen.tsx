import React from 'react'
import { View } from 'react-native'
import useWorkoutStore from '../../hooks/use-workout-store'
import ProgramDetail from '../ProgramDetail'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function ProgramDetailScreen({
  route
}: RootStackScreenProps<'ProgramDetailScreen'>) {
  const programs = useWorkoutStore(state => state.programs)
  const program = programs.find(p => p.programId === route.params.programId)
  return (
    <ScreenLayout>
      <View>{program && <ProgramDetail program={program} />}</View>
    </ScreenLayout>
  )
}
