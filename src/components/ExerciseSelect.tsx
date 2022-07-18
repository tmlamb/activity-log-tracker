import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise } from '../types'
import { sortByName } from '../utils'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { RootStackParamList } from './Navigation'
import SelectList from './SelectList'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  exercise?: Exercise
  availableExercises: Partial<Exercise>[]
  usedExercises?: Exercise[]
  addExercise: (exercise: Exercise) => void
  parentScreen: keyof RootStackParamList
  parentParams: object
  modalSelectId: string
}

export default function ExerciseSelect({
  exercise: initialValue,
  availableExercises,
  usedExercises,
  addExercise,
  parentScreen,
  parentParams,
  modalSelectId
}: Props) {
  const navigation = useNavigation()
  // TODO: remove 'React.' everywhere
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
          style={tw`px-4 py-4 -my-4 -mr-4`}
          disabled={!selected}
        >
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer
          style={tw`px-4 py-4 -my-4 -ml-4`}
          onPress={() => {
            navigation.goBack()
          }}
        >
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <SelectList
        style={tw`flex-grow px-3 pt-9`}
        keyExtractor={(item, index) => `${(item as Exercise).name}.${index}`}
        items={exercisesSortedAndDeduped}
        onSelect={item => {
          setSelected(item as Exercise)
        }}
        renderItem={({ item, index }) => (
          <>
            <CardInfo
              rightIcon={
                (item as Exercise).name === selected?.name && (
                  <SpecialText>
                    <AntDesign name="check" size={22} />
                  </SpecialText>
                )
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
            {usedExercises && index === usedExercises.length - 1 && (
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

ExerciseSelect.defaultProps = {
  exercise: undefined,
  usedExercises: undefined
}
