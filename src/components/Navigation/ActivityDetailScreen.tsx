import React from 'react'
import { Text, View } from 'react-native'
import { RootStackScreenProps } from './types'

function ActivityDetailScreen({ route }: RootStackScreenProps<'ActivityDetailScreen'>) {
  return (
    <View>
      <Text>{route.params.activityId}</Text>
    </View>
  )
}

export default ActivityDetailScreen
