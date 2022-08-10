import React from 'react'
import { View, Keyboard } from 'react-native'
import Animated, {
  withTiming,
  FadeInRight,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'
import tw from '../tailwind'
import ButtonContainer from './ButtonContainer'
import { ThemedTextInput, SpecialText } from './Themed'

type Props = {
  onChange: (text?: string) => void
}

export default function ExerciseSearchInput({ onChange }: Props) {
  const [showCancelButton, setShowCancelButton] = React.useState(false)
  const [searchComponentWidth, setSearchComponentWidth] = React.useState<number>(0)
  const [cancelButtonWidth, setCancelButtonWidth] = React.useState<number>(0)
  const searchFilterWidth = useSharedValue(searchComponentWidth)
  const searchFilterStyle = useAnimatedStyle(() => ({
    width: searchFilterWidth.value
  }))

  return (
    <View
      style={tw`flex-row items-center justify-between w-full mb-9`}
      onLayout={event => {
        const roundedWidth = Math.round(event.nativeEvent.layout.width)
        setSearchComponentWidth(roundedWidth)
        searchFilterWidth.value = withTiming(roundedWidth, { duration: 500 })
      }}
    >
      <Animated.View style={searchFilterStyle}>
        <ThemedTextInput
          onChangeText={text => {
            searchFilterWidth.value = withTiming(
              text?.length > 0 ? searchComponentWidth - cancelButtonWidth : searchComponentWidth,
              { duration: 500 }
            )
            setShowCancelButton(text?.length > 0)
            onChange(text)
          }}
          //   value={searchFilter}
          style={tw.style('rounded-xl')}
          label="Search"
          textInputStyle={tw`pl-16 web:pl-0`}
          maxLength={25}
        />
      </Animated.View>
      {showCancelButton && (
        <Animated.View
          entering={FadeInRight}
          exiting={FadeOutRight.duration(100)}
          onLayout={event => {
            const roundedWidth = Math.round(event.nativeEvent.layout.width)
            if (cancelButtonWidth !== roundedWidth) {
              setCancelButtonWidth(roundedWidth)
              searchFilterWidth.value = withTiming(searchComponentWidth - roundedWidth, {
                duration: 500
              })
            }
          }}
        >
          <ButtonContainer
            onPress={() => {
              searchFilterWidth.value = withTiming(searchComponentWidth, {
                duration: 500
              })
              onChange(undefined)
              setShowCancelButton(false)
              Keyboard.dismiss()
            }}
          >
            <SpecialText style={tw`pl-2.5 text-lg tracking-tight`}>Cancel</SpecialText>
          </ButtonContainer>
        </Animated.View>
      )}
    </View>
  )
}
