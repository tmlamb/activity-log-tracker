import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise } from '../types'
import { sortByName } from '../utils'
import ButtonContainer from './ButtonContainer'
import ExerciseSearchInput from './ExerciseSearchInput'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { RootStackParamList } from './Navigation'
import SelectList from './SelectList'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

type Props = {
  exercise?: Exercise
  availableExercises: Partial<Exercise>[]
  usedExercises?: Exercise[]
  addExercise: (exercise: Exercise) => void
  parentScreen: keyof RootStackParamList
  parentParams: object
  modalSelectId: string
  goBack: () => void
}

export default function ExerciseSelect({
  exercise: initialValue,
  availableExercises,
  usedExercises,
  addExercise,
  parentScreen,
  parentParams,
  modalSelectId,
  goBack
}: Props) {
  const [selected, setSelected] = React.useState(initialValue)

  const [searchFilter, setSearchFilter] = React.useState<string>()

  React.useEffect(
    () =>
      selected && !selected.exerciseId
        ? setSelected({ ...selected, exerciseId: uuidv4() })
        : undefined,
    [selected]
  )

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
  )

  return (
    <>
      <HeaderRightContainer>
        <LinkButton
          to={{
            screen: parentScreen,
            params:
              selected && modalSelectId
                ? {
                    ...parentParams,
                    modalSelectValue: selected,
                    modalSelectId
                  }
                : undefined
          }}
          beforeNavigation={() =>
            selected &&
            !usedExercises?.find(exercise => exercise.exerciseId === selected?.exerciseId) &&
            addExercise(selected)
          }
          disabled={!selected}
        >
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer onPress={goBack}>
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <SelectList
        style={tw`flex-1`}
        contentContainerStyle="pt-9 px-3 pb-48"
        keyExtractor={(item, index) => `${item.name}.${index}`}
        items={exercisesSortedAndDedupedAndFiltered}
        keyboardShouldPersistTaps="handled"
        onSelect={item => {
          setSelected(item as Exercise)
        }}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
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
              <PrimaryText style={tw`pr-6`} numberOfLines={1}>
                {item.name}
              </PrimaryText>
              {item.name === selected?.name && (
                <SpecialText style={tw`absolute right-2`}>
                  <AntDesign name="check" size={22} />
                </SpecialText>
              )}
            </ThemedView>
            {filteredUsedExercises &&
              index === filteredUsedExercises.length - 1 &&
              filteredAvailableExercises.length > 0 && (
                <View pointerEvents="none">
                  <SecondaryText style={tw`pb-1 pl-3 mt-0 text-sm`}>
                    Available Exercises
                  </SecondaryText>
                </View>
              )}
          </Animated.View>
        )}
        ListHeaderComponent={
          <>
            <ExerciseSearchInput onChange={text => setSearchFilter(text)} />
            <View style={tw`flex-row items-baseline justify-between px-3 pb-1`}>
              <SecondaryText style={tw`text-sm`}>
                {filteredUsedExercises && filteredUsedExercises.length > 0
                  ? 'Your Exercises'
                  : 'Available Exercises'}
              </SecondaryText>
              <LinkButton
                to={{ screen: 'ExerciseSettingsModal' }}
                style={tw`flex-row items-center`}
                accessibilityLabel="Navigate to Exercise Settings in order to add, remove, or edit exercise list"
              >
                <SpecialText style={tw`text-xs`}>Manage</SpecialText>
                <SpecialText style={tw`pl-0.5 pt-0.5 -pb-0.5 text-xs`}>
                  <AntDesign name="plus" size={14} />
                </SpecialText>
              </LinkButton>
            </View>
          </>
        }
      />
    </>
  )
}

ExerciseSelect.defaultProps = {
  exercise: undefined,
  usedExercises: undefined
}
