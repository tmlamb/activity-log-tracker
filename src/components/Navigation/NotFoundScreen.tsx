import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { Linking, View } from 'react-native'
import tw from '../../tailwind'
import ButtonContainer from '../ButtonContainer'
import { PrimaryText, SecondaryText, SpecialText } from '../Themed'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function NotFoundScreen({
  navigation: { navigate }
}: RootStackScreenProps<'NotFoundScreen'>) {
  return (
    <ScreenLayout>
      <View style={tw`flex-1 px-3 py-9 justify-start items-stretch`}>
        <PrimaryText style={tw``}>
          Something went wrong, or the page you were looking for could not be found.
        </PrimaryText>
        <ButtonContainer style={tw`mt-9`} onPress={() => navigate('DashboardScreen')}>
          <SpecialText style={tw``}>Return Home</SpecialText>
        </ButtonContainer>
        <ButtonContainer
          onPress={() => Linking.openURL('https://github.com/tmlamb/activity-log-tracker/issues')}
          accessibilityRole="link"
          accessibilityLabel="Open Application Feedback Page In Browser"
          style={tw`mt-9 flex-row items-center`}
        >
          <SecondaryText style={tw`mr-2`}>
            <AntDesign name="github" size={16} />
          </SecondaryText>
          <SpecialText style={tw``}>Send Feedback</SpecialText>
        </ButtonContainer>
      </View>
    </ScreenLayout>
  )
}
