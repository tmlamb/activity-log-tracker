import React from 'react'
import { View } from 'react-native'
import Animated, {
  RollInRight,
  RollOutRight,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated'
import { Context } from 'react-native-reanimated/lib/types/lib/reanimated2/hook/commonTypes'
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
  const offset = useSharedValue(0)

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: Context) => {
      ctx.startX = offset.value
    },
    onActive: (event, ctx) => {
      offset.value = ctx.startX + event.translationX
    },
    onEnd: _ => {
      offset.value = withSpring(0)
    }
  })

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }]
  }))
  return (
    <View style={tw.style('relative', style)}>
      <ButtonContainer
        onPress={() => {
          setToggle(!toggle)
          // offset.value = withSpring(offset.value === 0 ? -28 : 0, {}, finished => {
          //   if (finished) {
          //     console.log('anim ended')
          //   } else {
          //     console.log('anim cancelled????')
          //   }
          // })
        }}
      >
        {first}
      </ButtonContainer>
      {toggle && (
        <Animated.View
          entering={RollInRight.springify().stiffness(50).damping(6).mass(0.3)}
          exiting={RollOutRight.springify().stiffness(50).damping(6).mass(0.3)}
          style={[tw.style('absolute items-center justify-center h-full right-0')]}
          // style={[tw.style('absolute items-center justify-center h-full -right-7'), animatedStyles]}
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
