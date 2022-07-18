import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { FlatList } from 'react-native'
import tw from '../tailwind'
import { Exercise } from '../types'
import { sortByName } from '../utils'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './Navigation/LinkButton'
import { SecondaryText, SpecialText } from './Typography'

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
        <LinkButton to={{ screen: 'ExerciseFormModal' }} style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}>
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <FlatList
        style={tw`flex-grow px-3`}
        contentContainerStyle={tw`pb-48`}
        keyExtractor={(item, index) => `${(item as Exercise).name}.${index}`}
        data={exercisesSortedAndDeduped}
        renderItem={({ item, index }) => (
          <>
            <LinkButton
              to={{
                screen: 'ExerciseFormModal',
                params: { exerciseId: item.exerciseId, name: item.name }
              }}
              style={tw``}
            >
              <CardInfo
                rightIcon={
                  <SecondaryText>
                    <AntDesign name="right" size={16} />
                  </SecondaryText>
                }
                primaryText={(item as Exercise).name}
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
              />
            </LinkButton>
            {usedExercises && usedExercises.length > 0 && index === usedExercises.length - 1 && (
              <SecondaryText style={tw`pl-3 pb-1 mt-0 text-sm`}>Available Exercises</SecondaryText>
            )}
          </>
        )}
        ListHeaderComponent={
          (usedExercises && usedExercises.length > 0 && (
            <SecondaryText style={tw`pl-3 pb-1 mt-6 text-sm`}>Your Exercises</SecondaryText>
          )) || (
            <SecondaryText style={tw`pl-3 pb-1 mt-6 text-sm`}>Available Exercises</SecondaryText>
          )
        }
      />
    </>
  )
}

ExerciseSettings.defaultProps = {
  usedExercises: undefined
}
