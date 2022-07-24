import React from 'react'
import { View } from 'react-native'
import useWorkoutStore from '../../hooks/use-workout-store'
import ProgramFigures from '../ProgramFigures'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function ProgramFiguresScreen({
  route
}: RootStackScreenProps<'ProgramFiguresScreen'>) {
  const { programs, exercises } = useWorkoutStore(state => state)
  const program = programs.find(p => p.programId === route.params.programId)
  return (
    <ScreenLayout>
      <View>{program && <ProgramFigures program={program} exercises={exercises} />}</View>
    </ScreenLayout>
  )
}
