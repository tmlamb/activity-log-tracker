import React from 'react'
import { View } from 'react-native'
import tw from '../tailwind'

export default function WebWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={tw`flex-1 web:flex-row web:justify-center web:bg-slate-500`}>
      <View style={tw`flex-1 web:max-w-2xl bg-slate-50 dark:bg-black`}>{children}</View>
    </View>
  )
}
