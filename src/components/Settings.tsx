import { AntDesign } from '@expo/vector-icons'
import { To } from '@react-navigation/native/lib/typescript/src/useLinkTo'
import React from 'react'
import { FlatList } from 'react-native'
import tw from '../tailwind'
import LinkButton from './LinkButton'
import { RootStackParamList } from './Navigation'
import { PrimaryText, SecondaryText, ThemedView } from './Themed'

export default function Settings() {
  const data: {
    to: To<RootStackParamList, keyof RootStackParamList>
    label: string
  }[] = [
    { to: { screen: 'ProgramSettingsScreen' }, label: 'Programs' },
    { to: { screen: 'ExerciseSettingsScreen' }, label: 'Exercises' },
    { to: { screen: 'EquipmentSettingsScreen' }, label: 'Equipment' }
  ]

  return (
    <FlatList
      contentContainerStyle={tw`px-3 pb-48 pt-9`}
      data={data}
      bounces={false}
      renderItem={({ item, index }) => (
        <LinkButton to={item.to} style={tw``}>
          <ThemedView
            style={tw.style(
              index !== data.length - 1 ? 'border-b-2' : 'border-b-0 rounded-b-xl',
              index === 0 ? 'rounded-t-xl' : undefined
            )}
          >
            <PrimaryText>{item.label}</PrimaryText>
            <SecondaryText>
              <AntDesign name="setting" size={24} />
            </SecondaryText>
          </ThemedView>
        </LinkButton>
      )}
    />
  )
}
