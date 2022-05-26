import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Exercise } from '../types'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import TextInput from './TextInput'
import { SpecialText } from './Typography'

type Props = {
  changeHandler: (exercise: Exercise) => void
  exercise?: Exercise
  deleteHandler?: (exerciseId: string) => void
}

export default function ExerciseForm({ changeHandler, exercise, deleteHandler }: Props) {
  const navigation = useNavigation()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<Exercise>({
    defaultValues: {
      name: (exercise && exercise.name) || '',
      muscle: (exercise && exercise.muscle) || '',
      oneRepMax: (exercise && exercise.oneRepMax) || undefined
    }
  })
  const onSubmit = (data: Exercise) => {
    changeHandler(
      exercise
        ? { ...exercise, name: data.name, muscle: data.muscle, oneRepMax: data.oneRepMax }
        : {
            name: data.name,
            muscle: data.muscle,
            oneRepMax: data.oneRepMax,
            exerciseId: uuidv4()
          }
    )
    navigation.goBack()
  }

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)}>
          <SpecialText style={tw`font-bold`}>Save</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <View style={tw``}>
        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Exercise Name"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              maxLength={25}
              style={tw`mb-9`}
              textInputStyle={tw`pl-32`}
              editable={false}
            />
          )}
          name="name"
        />
        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Primary Muscle"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              maxLength={25}
              style={tw`mb-9`}
              textInputStyle={tw``}
              editable={false}
            />
          )}
          name="muscle"
        />
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="One Rep Max (lbs)"
              onChangeText={text => onChange({ unit: value?.unit, value: Number(text) })}
              onBlur={onBlur}
              value={String((value && value.value) || '')}
              maxLength={4}
              style={tw`mb-9`}
              textInputStyle={tw``}
              keyboardType="number-pad"
              numeric
            />
          )}
          name="oneRepMax"
        />
        {/* {exercise && deleteHandler && (
          <NavigationLink
            navigationParams={{ programId: program.programId }}
            screen="DashboardScreen"
            callback={() => deleteHandler(program.programId)}
          >
            <CardInfo style={tw``} alertText="Delete This Program" />
          </NavigationLink>
        )} */}
      </View>
    </>
  )
}

ExerciseForm.defaultProps = {
  exercise: undefined,
  deleteHandler: undefined
}
