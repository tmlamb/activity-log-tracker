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
      <Text>{route.params.sessionId}</Text>
    </View>
  )
}

export default SessionDetailScreen
