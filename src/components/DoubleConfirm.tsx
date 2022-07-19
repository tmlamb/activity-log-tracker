import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'

type Props = {
  style?: ClassInput
  first: JSX.Element
  second: JSX.Element
}

export default function DoubleConfirm({ style, first, second }: Props) {
  const [showSecond, setShowSecond] = React.useState(false)

  return (
    <View style={tw.style('relative', style)}>
      <ButtonContainer onPress={() => setShowSecond(true)}>{first}</ButtonContainer>
      <View
        style={tw.style(
          'absolute right-0 items-center justify-center h-full',
          showSecond ? 'right-0' : '-right-8'
        )}
      >
        {second}
      </View>
    </View>
  )
}

DoubleConfirm.defaultProps = {
  style: undefined
}
