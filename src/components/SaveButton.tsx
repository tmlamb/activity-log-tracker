import React from 'react'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import { SpecialText } from './Typography'

type Props = {
  onPress: () => void
}

export default function SaveButton({ onPress }: Props) {
  return (
    <HeaderRightContainer>
      <ButtonContainer onPress={onPress} style={tw`px-4 py-4 -my-4 -mr-4`}>
        <SpecialText style={tw`font-bold`}>Save</SpecialText>
      </ButtonContainer>
    </HeaderRightContainer>
  )
}
