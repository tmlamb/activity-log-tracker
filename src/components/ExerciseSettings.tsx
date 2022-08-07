import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { FlatList, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  FadeInRight,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import tw from '../tailwind'
import { Exercise } from '../types'
import { sortByName } from '../utils'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText, ThemedTextInput, ThemedView } from './Themed'

type Props = {
  availableExercises: Partial<Exercise>[]
  usedExercises?: Exercise[]
}

export default function ExerciseSettings({ availableExercises, usedExercises }: Props) {
  const [searchFilter, setSearchFilter] = React.useState<string>()
  const searchFilterWidth = useSharedValue(100)
  const searchFilterStyle = useAnimatedStyle(() => ({
    width: `${searchFilterWidth.value}%`
  }))

  const filteredUsedExercises = usedExercises?.filter(ue =>
    searchFilter ? ue.name.toUpperCase().includes(searchFilter.toUpperCase()) : true
  )

  const filteredAvailableExercises = availableExercises.filter(ae =>
    searchFilter ? ae.name?.toUpperCase().includes(searchFilter.toUpperCase()) : true
  )

  const exercisesSortedAndDedupedAndFiltered = sortByName([
    ...(filteredUsedExercises || [])
  ]).concat(
    filteredAvailableExercises.filter(
      filteredAvailableExercise =>
        !filteredUsedExercises?.find(e => e.name === filteredAvailableExercise.name)
    )
  ) as Partial<Exercise>[]

  return (
    <>
      <HeaderRightContainer>
        <LinkButton
          to={{ screen: 'ExerciseFormModal' }}
          style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}
          disabled={exercisesSortedAndDedupedAndFiltered.length > 1000}
        >
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <FlatList
        contentContainerStyle={tw`px-3 pb-48 pt-9`}
        keyExtractor={(item, index) => `${(item as Exercise).name}.${index}`}
        data={exercisesSortedAndDedupedAndFiltered}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
            exiting={FadeOut.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
          >
            <LinkButton
              to={{
                screen: 'ExerciseFormModal',
                params: { exerciseId: item.exerciseId, name: item.name }
              }}
            >
              <ThemedView
                style={tw.style(
                  'border-b-2',
                  index === 0 || (filteredUsedExercises && index === filteredUsedExercises.length)
                    ? 'rounded-t-xl'
                    : undefined,
                  (filteredUsedExercises && index === filteredUsedExercises.length - 1) ||
                    index === exercisesSortedAndDedupedAndFiltered.length - 1
                    ? 'border-b-0 rounded-b-xl mb-6'
                    : undefined
                )}
              >
                <PrimaryText style={tw`flex-1 pr-2.5`} numberOfLines={1}>
                  {item.name}
                </PrimaryText>
                <SecondaryText style={tw`absolute right-2`}>
                  <AntDesign name="right" size={16} />
                </SecondaryText>
              </ThemedView>
            </LinkButton>
            {filteredUsedExercises &&
              filteredUsedExercises.length > 0 &&
              index === filteredUsedExercises.length - 1 && (
                <SecondaryText style={tw`pb-1 pl-3 mt-0 text-sm`}>
                  Available Exercises
                </SecondaryText>
              )}
          </Animated.View>
        )}
        ListHeaderComponent={
          <>
            <View style={tw`flex-row items-center justify-between w-full mb-9`}>
              <Animated.View style={searchFilterStyle}>
                <ThemedTextInput
                  onChangeText={text => {
                    searchFilterWidth.value = withTiming(text?.length > 0 ? 81 : 100)
                    setSearchFilter(text)
                  }}
                  value={searchFilter}
                  style={tw.style('rounded-xl')}
                  label="Search"
                  textInputStyle={tw`pl-32`}
                  maxLength={25}
                />
              </Animated.View>
              {searchFilter && (
                <Animated.View
                  entering={FadeInRight.duration(500).stiffness(50).damping(6).mass(0.3)}
                  exiting={FadeOutRight.duration(500).stiffness(50).damping(6).mass(0.3)}
                >
                  <ButtonContainer
                    onPress={() => {
                      searchFilterWidth.value = withTiming(100)
                      setSearchFilter(undefined)
                    }}
                  >
                    <SpecialText>Cancel</SpecialText>
                  </ButtonContainer>
                </Animated.View>
              )}
            </View>
            <SecondaryText style={tw`pb-1 pl-3 text-sm`}>
              {filteredUsedExercises && filteredUsedExercises.length > 0
                ? 'Your Exercises'
                : 'Available Exercises'}
            </SecondaryText>
          </>
        }
        keyboardShouldPersistTaps="handled"
      />
    </>
  )
}

ExerciseSettings.defaultProps = {
  usedExercises: undefined
}
