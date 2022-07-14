import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Exercise } from '../types'
import { sortByName } from '../utils'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import SelectList from './SelectList'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  exercise?: Exercise
  availableExercises: Partial<Exercise>[]
  usedExercises?: Exercise[]
  onSelect: (exercise: Exercise) => void
  addExercise: (exercise: Exercise) => void
}

type FormData = {
  exercise?: Partial<Exercise>
}

export default function ExerciseSelect({
  exercise: initialValue,
  availableExercises,
  usedExercises,
  onSelect,
  addExercise
}: Props) {
  const navigation = useNavigation()
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      exercise: initialValue
    }
  })

  const onSubmit = ({ exercise: selectedExercise }: FormData) => {
    if (selectedExercise) {
      let submittedExercise = selectedExercise as Exercise
      if (!selectedExercise.exerciseId) {
        submittedExercise = { ...submittedExercise, exerciseId: uuidv4() } as Exercise
        addExercise(submittedExercise)
      }

      onSelect(submittedExercise)
      navigation.goBack()
    }
  }

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
        <ButtonContainer onPress={handleSubmit(onSubmit)} style={tw`px-4 py-4 -my-4 -mr-4`}>
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </ButtonContainer>
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
      <Controller
        control={control}
        rules={{
          required: false
        }}
        render={({ field: { onChange, onBlur, value: selectedExercise } }) => (
          <SelectList
            style={tw`flex-grow px-3 pt-9`}
            keyExtractor={(item, index) => `${(item as Exercise).name}.${index}`}
            items={exercisesSortedAndDeduped}
            onSelect={item => {
              onChange(item as Exercise)
            }}
            renderItem={({ item, index }) => (
              <>
                <CardInfo
                  rightIcon={
                    (item as Exercise).name === selectedExercise?.name && (
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
                  <SecondaryText style={tw`pb-1 pl-3 mt-0 text-sm`}>
                    Available Exercises
                  </SecondaryText>
                )}
              </>
            )}
            ListHeaderComponent={
              <>
                {/* <SecondaryText style={tw`pb-1 pl-3 text-sm`}>Current Selection</SecondaryText>
                <CardInfo
                  primaryText="Exercise"
                  secondaryText={selectedExercise?.name}
                  style={tw`rounded-xl`}
                /> */}

                {(usedExercises && usedExercises.length > 0 && (
                  <SecondaryText style={tw`pb-1 pl-3 text-sm`}>Your Exercises</SecondaryText>
                )) || (
                  <SecondaryText style={tw`pb-1 pl-3 text-sm`}>Available Exercises</SecondaryText>
                )}
              </>
            }
          />
        )}
        name="exercise"
      />
    </>
  )
}

ExerciseSelect.defaultProps = {
  exercise: undefined,
  usedExercises: undefined
}
