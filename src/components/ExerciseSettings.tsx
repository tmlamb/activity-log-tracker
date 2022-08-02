import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { FlatList } from 'react-native'
import tw from '../tailwind'
import { Exercise } from '../types'
import { sortByName } from '../utils'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

type Props = {
  availableExercises: Partial<Exercise>[]
  usedExercises?: Exercise[]
}

export default function ExerciseSettings({ availableExercises, usedExercises }: Props) {
  const exercisesSortedAndDeduped = React.useMemo(
    () =>
      sortByName([...(usedExercises || [])]).concat(
        availableExercises.filter(
          availableExercise => !usedExercises?.find(e => e.name === availableExercise.name)
        )
      ) as Partial<Exercise>[],
    [availableExercises, usedExercises]
  )
  return (
    <>
      <HeaderRightContainer>
        <LinkButton
          to={{ screen: 'ExerciseFormModal' }}
          style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}
          disabled={exercisesSortedAndDeduped.length > 1000}
        >
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <FlatList
        contentContainerStyle={tw`px-3 pb-48 pt-9`}
        keyExtractor={(item, index) => `${(item as Exercise).name}.${index}`}
        data={exercisesSortedAndDeduped}
        renderItem={({ item, index }) => (
          <>
            <LinkButton
              to={{
                screen: 'ExerciseFormModal',
                params: { exerciseId: item.exerciseId, name: item.name }
              }}
            >
              <ThemedView
                style={tw.style(
                  'border-b-2',
                  index === 0 || (usedExercises && index === usedExercises.length)
                    ? 'rounded-t-xl'
                    : undefined,
                  (usedExercises && index === usedExercises.length - 1) ||
                    index === exercisesSortedAndDeduped.length - 1
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
            {usedExercises && usedExercises.length > 0 && index === usedExercises.length - 1 && (
              <SecondaryText style={tw`pb-1 pl-3 mt-0 text-sm`}>Available Exercises</SecondaryText>
            )}
          </>
        )}
        ListHeaderComponent={
          (usedExercises && usedExercises.length > 0 && (
            <SecondaryText style={tw`pb-1 pl-3 text-sm`}>Your Exercises</SecondaryText>
          )) || <SecondaryText style={tw`pb-1 pl-3 text-sm`}>Available Exercises</SecondaryText>
        }
      />
    </>
  )
}

ExerciseSettings.defaultProps = {
  usedExercises: undefined
}
