import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { Button, FlatList, Text, View } from 'react-native'
import { StackParamList } from '../../App'

type Props = NativeStackScreenProps<StackParamList, 'SingleLog'>

function SingleLog({ route, navigation }: Props) {
  const name = 'Workout'
  const activities = [
    { name: 'Squat', id: '1' },
    { name: 'Bench Press', id: '2' },
  ]
  return (
    <View>
      <Text>{name}</Text>
      <FlatList
        data={activities}
        renderItem={({ item }) => (
          <Button
            title={`Go to ${item.name}`}
            onPress={() =>
              navigation.navigate('SingleActivity', {
                logId: route.params.logId,
                activityId: item.id,
                name: item.name,
              })
            }
          />
        )}
      />
    </View>
  )
}

export default SingleLog
