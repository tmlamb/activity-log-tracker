import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { Text, View } from 'react-native'
import { StackParamList } from '../../types'

type Props = NativeStackScreenProps<StackParamList, 'ActivityDetailScreen'>
export type ActivityNavigationProp = Props['navigation']

function ActivityDetailScreen({ route }: Props) {
  return (
    <View>
      <Text>{route.params.entityId}</Text>
    </View>
  )
}

export default ActivityDetailScreen
