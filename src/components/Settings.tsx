import { AntDesign } from '@expo/vector-icons'
import { To } from '@react-navigation/native/lib/typescript/src/useLinkTo'
import React from 'react'
import { FlatList, Linking, View } from 'react-native'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'
import LinkButton from './LinkButton'
import { RootStackParamList } from './Navigation'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

export default function Settings() {
  const data: {
    to: To<RootStackParamList, keyof RootStackParamList>
    label: string
    accessibilityLabel?: string
  }[] = [
    {
      to: { screen: 'ProgramSettingsScreen' },
      label: 'Workout Programs',
      accessibilityLabel: 'Navigate To Manage Workout Programs'
    },
    {
      to: { screen: 'ExerciseSettingsScreen' },
      label: 'Exercises',
      accessibilityLabel: 'Navigate To Manage Exercises'
    },
    {
      to: { screen: 'EquipmentSettingsScreen' },
      label: 'Equipment',
      accessibilityLabel: 'Navigate To Manage Equipment'
    }
  ]

  return (
    <View style={tw`flex-grow justify-between pb-9`}>
      <FlatList
        contentContainerStyle={tw`mx-3 mt-9`}
        style={tw``}
        data={data}
        bounces={false}
        renderItem={({ item, index }) => (
          <LinkButton to={item.to} accessibilityLabel={item.accessibilityLabel}>
            <ThemedView
              style={tw.style(
                'web:pt-[7px] web:pb-[3px] relative',
                index !== data.length - 1 ? 'border-b-2' : 'border-b-0 rounded-b-xl',
                index === 0 ? 'rounded-t-xl' : undefined
              )}
            >
              <PrimaryText>{item.label}</PrimaryText>
              <SecondaryText style={tw`absolute right-2 self-center`}>
                <AntDesign name="setting" size={20} />
              </SecondaryText>
            </ThemedView>
          </LinkButton>
        )}
      />
      <ButtonContainer
        onPress={() => Linking.openURL('https://github.com/tmlamb/activity-log-tracker/issues')}
        accessibilityRole="link"
        accessibilityLabel="Open Application Feedback Page In Browser"
        style={tw`flex-row justify-center items-center self-center py-2`}
      >
        <SecondaryText style={tw`mr-2`}>
          <AntDesign name="github" size={16} />
        </SecondaryText>
        <SpecialText style={tw`self-center`}>Feedback?</SpecialText>
      </ButtonContainer>
    </View>
  )
}
