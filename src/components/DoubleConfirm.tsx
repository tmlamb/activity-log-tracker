import React from 'react'
import { View } from 'react-native'
import Animated, { RollInRight, RollOutRight } from 'react-native-reanimated'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'

type Props = {
  style?: ClassInput
  first: JSX.Element
  second: JSX.Element
}

export default function DoubleConfirm({ style, first, second }: Props) {
  const [toggle, setToggle] = React.useState(false)

  return (
    <View style={tw.style('relative', style)}>
      <ButtonContainer
        onPress={() => {
          setToggle(!toggle)
        }}
      >
        {first}
      </ButtonContainer>
      {toggle && (
        <Animated.View
          entering={RollInRight.springify().stiffness(50).damping(6).mass(0.3)}
          exiting={RollOutRight.springify().stiffness(50).damping(6).mass(0.3)}
          style={[tw.style('absolute items-center justify-center h-full right-0')]}
        >
          {second}
        </Animated.View>
      )}
    </View>
  )
}

DoubleConfirm.defaultProps = {
  style: undefined
}
