import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { FlatList } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import tw from '../tailwind'
import { Exercise } from '../types'
import { sortByName } from '../utils'
import ExerciseSearchInput from './ExerciseSearchInput'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

type Props = {
  availableExercises: Partial<Exercise>[]
  usedExercises?: Exercise[]
}

export default function ExerciseSettings({ availableExercises, usedExercises }: Props) {
  const [searchFilter, setSearchFilter] = React.useState<string>()

  const filteredUsedExercises = usedExercises?.filter(ue =>
    searchFilter
      ? ue.name
          .replace(/\s/g, '')
          .toUpperCase()
          .includes(searchFilter.replace(/\s/g, '').toUpperCase())
      : true
  )

  const filteredAvailableExercises = availableExercises.filter(ae =>
    searchFilter
      ? ae.name
          ?.replace(/\s/g, '')
          .toUpperCase()
          .includes(searchFilter.replace(/\s/g, '').toUpperCase())
      : true
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
          accessibilityLabel="Navigate to Create Exercise Form"
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
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <LinkButton
              to={{
                screen: 'ExerciseFormModal',
                params: { exerciseId: item.exerciseId, name: item.name }
              }}
              accessibilityLabel={`Navigate to Edit Exercise with name ${item.name}`}
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
                <SecondaryText style={tw`mb-1 ml-3 mt-0 text-sm`}>
                  Available Exercises
                </SecondaryText>
              )}
          </Animated.View>
        )}
        ListHeaderComponent={
          <>
            <ExerciseSearchInput onChange={text => setSearchFilter(text)} />
            <SecondaryText style={tw`mb-1 ml-3 text-sm`}>
              {filteredUsedExercises && filteredUsedExercises.length > 0
                ? 'Your Exercises'
                : 'Available Exercises'}
            </SecondaryText>
          </>
        }
      />
    </>
  )
}

ExerciseSettings.defaultProps = {
  usedExercises: undefined
}
