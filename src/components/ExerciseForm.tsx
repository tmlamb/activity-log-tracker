import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ScrollView } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise, Program } from '../types'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import TextInput from './TextInput'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  changeHandler: (exercise: Exercise) => void
  exercise?: Exercise
  name?: string
  deleteHandler?: (exerciseId: string) => void
  programs?: Program[]
  exercises?: Exercise[]
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
  exercises
}: Props) {
  const navigation = useNavigation()

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
    navigation.goBack()
  }

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)} style={tw`py-4 -my-4 px-4 -mr-4`}>
          <SpecialText style={tw`font-bold`}>Save</SpecialText>
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
      <ScrollView style={tw`flex-grow py-9`}>
        {exercise && (
          <SecondaryText style={tw`px-3 pb-1.5 text-xs`}>
            Warning: Modified exercise data reflects in existing workouts where it&apos;s been used.
            Exercises used in a workout cannot be deleted.
          </SecondaryText>
        )}
        <Controller
          name="name"
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { ref, onChange, onBlur, value } }) => (
            <TextInput
              label="Exercise Name"
              innerRef={ref}
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              maxLength={25}
              style={tw`mb-9`}
              textInputStyle={tw`pl-32`}
              error={errors.name ? 'Exercise Name is required' : undefined}
            />
          )}
        />
        <Controller
          control={control}
          rules={{
            required: false,
            min: 5
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="One Rep Max (lbs)"
              onChangeText={text => onChange({ unit: value?.unit, value: Number(text) })}
              onBlur={onBlur}
              value={String((value && value.value) || '')}
              maxLength={4}
              style={tw``}
              textInputStyle={tw``}
              keyboardType="number-pad"
              numeric
            />
          )}
          name="oneRepMax"
        />
        <Controller
          control={control}
          rules={{
            required: false
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Primary Muscle"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              maxLength={25}
              style={tw`mt-9`}
              textInputStyle={tw`pl-32`}
            />
          )}
          name="primaryMuscle"
        />
        {exercise &&
          deleteHandler &&
          !(
            programs &&
            programs?.find(program =>
              program.sessions.find(session =>
                session.activities.find(activity => activity.exerciseId === exercise.exerciseId)
              )
            )
          ) && (
            <ButtonContainer
              onPress={() => {
                deleteHandler(exercise.exerciseId)

                navigation.goBack()
              }}
              style={tw`mt-9`}
            >
              <CardInfo style={tw``} alertText="Delete This Exercise" />
            </ButtonContainer>
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
