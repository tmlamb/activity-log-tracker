import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { Text, View } from 'react-native'
import { tw } from '../../tailwind'
import { StackParamList } from '../../types'

type Props = NativeStackScreenProps<StackParamList, 'SessionDetailScreen'>
export type SessionNavigationProp = Props['navigation']

function SessionDetailScreen({ route }: Props) {
  return (
    <View style={tw`dark:bg-black`}>
      <Text>{route.params.entityId}</Text>
      {/* <Text>{route.params.workout.priority.name}</Text>
      <FlatList
        data={route.params.workout.activities}
        renderItem={({ item }) => (
          <Button
            title={`Go to ${item.exercise.name}`}
            onPress={() =>
              navigation.navigate('ActivityScreen', {
                activity: item
              })
            }
          />
        )}
      /> */}
    </View>
  )
}

export default SessionDetailScreen
