import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise } from '../types'
import { sortByName } from '../utils'
import ButtonContainer from './ButtonContainer'
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

  React.useEffect(
    () =>
      selected && !selected.exerciseId
        ? setSelected({ ...selected, exerciseId: uuidv4() })
        : undefined,
    [selected]
  )

  const exercisesSortedAndDeduped = React.useMemo(
    () =>
      sortByName([...(usedExercises || [])]).concat(
        availableExercises.filter(
          availableExercise => !usedExercises?.find(e => e.name === availableExercise.name)
        )
      ),
    [availableExercises, usedExercises]
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
        items={exercisesSortedAndDeduped}
        onSelect={item => {
          setSelected(item as Exercise)
        }}
        renderItem={({ item, index }) => (
          <>
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
              <PrimaryText>{item.name}</PrimaryText>
              {item.name === selected?.name && (
                <SpecialText>
                  <AntDesign name="check" size={22} />
                </SpecialText>
              )}
            </ThemedView>
            {usedExercises && index === usedExercises.length - 1 && (
              <SecondaryText style={tw`pb-1 pl-3 mt-0 text-sm`}>Available Exercises</SecondaryText>
            )}
          </>
        )}
        ListHeaderComponent={
          <View style={tw`flex-row items-center px-3 pb-1`}>
            <SecondaryText style={tw`text-sm`}>
              {usedExercises && usedExercises.length > 0 ? 'Your Exercises' : 'Available Exercises'}
            </SecondaryText>
            <LinkButton to={{ screen: 'ExerciseSettingsModal' }}>
              <SpecialText style={tw`text-sm`}>&nbsp;&ndash;&nbsp;Manage</SpecialText>
            </LinkButton>
          </View>
        }
      />
    </>
  )
}

ExerciseSelect.defaultProps = {
  exercise: undefined,
  usedExercises: undefined
}
