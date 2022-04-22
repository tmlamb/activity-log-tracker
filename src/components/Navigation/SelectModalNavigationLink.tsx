import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import { ExerciseSelectNavParams, LoadFormNavParams } from '../../types'
import { ExerciseSelectNavigationProp } from './ExerciseSelectModal'
import { LoadFormNavigationProp } from './LoadFormModal'

type Props = {
  children: React.ReactNode
  screen: 'LoadFormModal' | 'ExerciseSelectModal'
  navigationParams: LoadFormNavParams | ExerciseSelectNavParams
  callback?: () => void
  style?: ClassInput
}

interface PropsFilled extends Props {
  callback: () => void
}

export default function SelectModalNavigationLink({
  children,
  screen,
  navigationParams,
  callback,
  style
}: PropsFilled) {
  const navigation = useNavigation<LoadFormNavigationProp | ExerciseSelectNavigationProp>()

  return (
    <Pressable
      onPress={() => {
        callback()
        return navigation.navigate(screen, navigationParams)
      }}
      style={tw.style(style)}
    >
      {children}
    </Pressable>
  )
}

SelectModalNavigationLink.defaultProps = {
  callback: () => null,
  style: undefined
}
