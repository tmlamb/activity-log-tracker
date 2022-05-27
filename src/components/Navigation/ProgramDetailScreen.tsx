import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { View } from 'react-native'
import useWorkoutStore from '../../hooks/use-workout-store'
import { StackParamList } from '../../types'
import ProgramDetail from '../ProgramDetail'
import ScreenLayout from './ScreenLayout'

type Props = NativeStackScreenProps<StackParamList, 'ProgramDetailScreen'>
export type ProgramNavigationProp = Props['navigation']

export default function ProgramDetailScreen({ route }: Props) {
  const programs = useWorkoutStore(state => state.programs)
  const program = programs.find(p => p.programId === route.params.programId)
  return (
    <ScreenLayout>
      <View>{program && <ProgramDetail program={program} />}</View>
    </ScreenLayout>
  )
}
