import React from 'react'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'
import HeaderLeftContainer from './HeaderLeftContainer'
import { SpecialText } from './Typography'

type Props = {
  onPress: () => void
}

export default function CancelButton({ onPress }: Props) {
  return (
    <HeaderLeftContainer>
      <ButtonContainer onPress={onPress} style={tw`px-4 py-4 -my-4 -ml-4`}>
        <SpecialText>Cancel</SpecialText>
      </ButtonContainer>
    </HeaderLeftContainer>
  )
}
