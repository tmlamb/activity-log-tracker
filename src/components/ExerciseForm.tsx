import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ScrollView } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise, Program } from '../types'
import ButtonContainer from './ButtonContainer'
import DoubleConfirm from './DoubleConfirm'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import { AlertText, SecondaryText, SpecialText, ThemedTextInput, ThemedView } from './Themed'

type Props = {
  changeHandler: (exercise: Exercise) => void
  exercise?: Exercise
  name?: string
  deleteHandler?: (exerciseId: string) => void
  programs?: Program[]
  exercises?: Exercise[]
  goBack: () => void
}

function compareStrings(a: string, b: string) {
  return a.split(/\s/).join('') === b.split(/\s/).join('')
}
const spaceReplace = (str: string) => str.replace(/\u00a0/, '\u0020')

export default function ExerciseForm({
  changeHandler,
  exercise,
  name,
  deleteHandler,
  programs,
  exercises,
  goBack
}: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<Exercise>({
    defaultValues: {
      name: (exercise && exercise.name) || name || '',
      oneRepMax: (exercise && exercise.oneRepMax) || undefined,
      primaryMuscle: (exercise && exercise.primaryMuscle) || undefined
    }
  })

  const usedInWorkout =
    programs &&
    programs?.find(program =>
      program.sessions.find(session =>
        session.activities.find(activity => activity.exerciseId === exercise?.exerciseId)
      )
    )

  const onSubmit = (data: Exercise) => {
    if (
      exercises?.find(
        e => e.exerciseId !== exercise?.exerciseId && compareStrings(e.name, data.name)
      )
    ) {
      return
    }

    changeHandler(
      exercise
        ? {
            ...exercise,
            name: spaceReplace(data.name),
            oneRepMax: data.oneRepMax,
            primaryMuscle: data.primaryMuscle && spaceReplace(data.primaryMuscle)
          }
        : {
            name: spaceReplace(data.name),
            oneRepMax: data.oneRepMax,
            primaryMuscle: data.primaryMuscle && spaceReplace(data.primaryMuscle),
            exerciseId: uuidv4()
          }
    )
    goBack()
  }

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)}>
          <SpecialText style={tw`font-bold`}>Save</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer onPress={goBack}>
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <ScrollView style={tw`py-9`}>
        <Controller
          name="name"
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { ref, onChange, onBlur, value } }) => (
            <ThemedTextInput
              label="Exercise Name"
              innerRef={ref}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              maxLength={25}
              textInputStyle={tw`pl-32`}
              error={errors.name ? 'Exercise Name is required' : undefined}
            />
          )}
        />
        {exercise && usedInWorkout && (
          <SecondaryText style={tw`px-3 pt-1.5 text-xs`}>
            Warning: Modifying exercise name reflects in existing workouts where it&apos;s been
            used.
          </SecondaryText>
        )}
        <Controller
          name="oneRepMax"
          control={control}
          rules={{
            required: false,
            min: 5
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput
              label="One Rep Max (lbs)"
              onChangeText={text => onChange({ unit: value?.unit, value: Number(text) })}
              onBlur={onBlur}
              value={String((value && value.value) || '')}
              maxLength={4}
              style={tw`mt-9`}
              textInputStyle={tw``}
              keyboardType="number-pad"
              numeric
            />
          )}
        />
        <Controller
          name="primaryMuscle"
          control={control}
          rules={{
            required: false
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedTextInput
              label="Primary Muscle"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              maxLength={18}
              style={tw`mt-9`}
              textInputStyle={tw`pl-32`}
            />
          )}
        />
        {exercise && deleteHandler && !usedInWorkout && (
          <DoubleConfirm
            style={tw`mt-9`}
            first={
              <ThemedView>
                <AlertText>Delete This Exercise</AlertText>
              </ThemedView>
            }
            second={
              <ButtonContainer
                onPress={() => {
                  deleteHandler(exercise.exerciseId)
                  goBack()
                }}
              >
                <AlertText style={tw`px-3 py-3 -my-3`}>
                  <AntDesign name="minuscircle" size={15} />
                </AlertText>
              </ButtonContainer>
            }
          />
        )}
        {usedInWorkout && (
          <SecondaryText style={tw`px-3 pt-9 text-xs`}>
            Exercises used in a workout cannot be deleted.
          </SecondaryText>
        )}
      </ScrollView>
    </>
  )
}

ExerciseForm.defaultProps = {
  exercise: undefined,
  name: undefined,
  deleteHandler: undefined,
  programs: undefined,
  exercises: undefined
}
