import React from 'react'
import Settings from '../Settings'
import ScreenLayout from './ScreenLayout'
import { RootStackScreenProps } from './types'

export default function SettingsScreen({
  navigation: { goBack }
}: RootStackScreenProps<'SettingsScreen'>) {
  return (
    <ScreenLayout>
      <Settings goBack={goBack} />
    </ScreenLayout>
  )
}
