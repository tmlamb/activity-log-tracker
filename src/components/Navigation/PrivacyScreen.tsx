import React from 'react'
import tw from '../../tailwind'
import { PrimaryText } from '../Themed'
import ScreenLayout from './ScreenLayout'

export default function PrivacyScreen() {
  return (
    <ScreenLayout>
      <PrimaryText style={tw`p-3`}>
        Workout Activity Log Tracker does not collect any personal information. If despite this, any
        of your personal information were to be obtained by the app, we would not sell or give it to
        anyone.
      </PrimaryText>
    </ScreenLayout>
  )
}
