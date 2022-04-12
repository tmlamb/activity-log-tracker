import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { View } from 'react-native'
import { useProgramState } from '../../context/ProgramState'
import { StackParamList } from '../../types'
import { ProgramDetail } from '../ProgramDetail'

type Props = NativeStackScreenProps<StackParamList, 'ProgramDetailScreen'>
export type ProgramNavigationProp = Props['navigation']

export default function ProgramDetailScreen({ route }: Props) {
  const { programs } = useProgramState()
  const program = programs.find(p => p.entityId === route.params.entityId)
  return <View>{program && <ProgramDetail program={program} />}</View>
}
