import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { ScrollView } from 'react-native'
import tw from '../tailwind'
import CardInfo from './CardInfo'
import LinkButton from './LinkButton'
import { SecondaryText } from './Typography'

export default function Settings() {
  return (
    <ScrollView style={tw`flex-grow px-3 pt-9 pb-36`}>
      <LinkButton to={{ screen: 'ExerciseSettingsScreen' }} style={tw``}>
        <CardInfo
          rightIcon={
            <SecondaryText>
              <AntDesign name="setting" size={24} />
            </SecondaryText>
          }
          primaryText="Manage Exercises"
          style={tw.style('rounded-xl')}
        />
      </LinkButton>
      <SecondaryText style={tw`pl-3 pt-1.5 text-xs`}>
        Manage your list of exercises and their settings, like One Rep Max and muscle groups.
      </SecondaryText>
      <LinkButton to={{ screen: 'ProgramSettingsScreen' }} style={tw`mt-9`}>
        <CardInfo
          rightIcon={
            <SecondaryText>
              <AntDesign name="setting" size={24} />
            </SecondaryText>
          }
          primaryText="Manage Programs"
          style={tw.style('rounded-xl')}
        />
      </LinkButton>
      <SecondaryText style={tw`pl-3 pt-1.5 text-xs`}>Add or edit workout programs.</SecondaryText>
    </ScrollView>
  )
}
