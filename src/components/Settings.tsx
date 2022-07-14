import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { ScrollView } from 'react-native'
import { tw } from '../tailwind'
import CardInfo from './CardInfo'
import NavigationLink from './Navigation/NavigationLink'
import { SecondaryText } from './Typography'

export default function Settings() {
  return (
    <ScrollView style={tw`flex-grow px-3 pt-9 pb-36`}>
      <NavigationLink screen="ExerciseSettingsScreen" style={tw``}>
        <CardInfo
          rightIcon={
            <SecondaryText>
              <AntDesign name="setting" size={24} />
            </SecondaryText>
          }
          primaryText="Manage Exercises"
          style={tw.style('rounded-xl')}
        />
      </NavigationLink>
      <SecondaryText style={tw`pl-3 pt-1.5 text-xs`}>
        Manage the list of exercises and their settings, like One Rep Max and muscle groups.
      </SecondaryText>
    </ScrollView>
  )
}
