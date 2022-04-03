import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { Button, FlatList, View } from 'react-native'
import { StackParamList } from '../../App'

type Props = NativeStackScreenProps<StackParamList, 'Logs'>

const logs = [
  {
    name: 'Workout',
    id: '1',
    activities: [
      { name: 'Squat', id: 1 },
      { name: 'Bench Press', id: 2 },
    ],
  },
  {
    name: 'Weight',
    id: '2',
    activities: [{ name: 'Weigh-in', id: 1 }],
  },
]
function Tracker({ navigation }: Props) {
  return (
    <View>
      <FlatList
        data={logs}
        renderItem={({ item }) => (
          <Button
            title={`Go to ${item.name}`}
            onPress={() =>
              navigation.navigate('SingleLog', {
                logId: item.id,
                name: item.name,
              })
            }
          >
            {item.name},
          </Button>
        )}
        keyExtractor={item => item.id}
      />
    </View>
  )
}

export default Tracker
