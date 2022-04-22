import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { StackParamList } from '../../types'
import LoadForm from '../LoadForm'
import ModalLayout from './ModalLayout'

type Props = NativeStackScreenProps<StackParamList, 'LoadFormModal'>
export type LoadFormNavigationProp = Props['navigation']

export default function LoadFormModal({ route }: Props) {
  const { value, onChangeSelect } = route.params

  return (
    <ModalLayout>
      <LoadForm load={value} onSelect={onChangeSelect} />
    </ModalLayout>
  )
}
