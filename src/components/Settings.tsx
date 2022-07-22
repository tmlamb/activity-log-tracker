import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { ScrollView } from 'react-native'
import tw from '../tailwind'
import CardInfo from './CardInfo'
import LinkButton from './LinkButton'
import { SecondaryText } from './Typography'

export default function Settings() {
  return (
    // Make this a list view
    <ScrollView style={tw`flex-grow px-3 pt-9 pb-36`}>
      <LinkButton to={{ screen: 'ExerciseSettingsScreen' }} style={tw``}>
        <CardInfo
          rightIcon={
            <SecondaryText>
              <AntDesign name="setting" size={24} />
            </SecondaryText>
          }
          primaryText="Manage Exercises"
          style={tw.style('rounded-t-xl border-b-2')}
        />
      </LinkButton>
      <LinkButton to={{ screen: 'EquipmentSettingsScreen' }} style={tw``}>
        <CardInfo
          rightIcon={
            <SecondaryText>
              <AntDesign name="setting" size={24} />
            </SecondaryText>
          }
          primaryText="Manage Equipment"
          style={tw.style('border-b-2')}
        />
      </LinkButton>
      <LinkButton to={{ screen: 'ProgramSettingsScreen' }} style={tw``}>
        <CardInfo
          rightIcon={
            <SecondaryText>
              <AntDesign name="setting" size={24} />
            </SecondaryText>
          }
          primaryText="Manage Programs"
          style={tw.style('rounded-b-xl')}
        />
      </LinkButton>
    </ScrollView>
  )
}
