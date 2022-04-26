import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { LogBox, View } from 'react-native'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Exercise } from '../types'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import SelectList from './SelectList'
import { SpecialText } from './Typography'

// TODO: Address problem with non-serializable navigation prop (see onSelect function), then remove this ignore statement
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state'])

type Props = {
  exerciseId?: string
  availableExercises: Partial<Exercise>[]
  usedExercises?: Exercise[]
  onSelect: (exerciseId: string) => void
  addExercise: (exercise: Exercise) => void
}

type FormData = {
  exercise: Partial<Exercise> | undefined
}

export default function ExerciseSelect({
  exerciseId,
  availableExercises,
  usedExercises,
  onSelect,
  addExercise
}: Props) {
  const navigation = useNavigation()
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setValue
  } = useForm<FormData>({
    defaultValues: {
      exercise: usedExercises?.find(exercise => exerciseId === exercise.exerciseId)
    }
  })
  const selectedExercise = watch('exercise')

  const combinedOptions = availableExercises
  if (availableExercises) {
    if (usedExercises) {
      // setExerciseOptions([...exerciseOptions, ...usedExercises.map(exercise => ({}))])
      usedExercises.forEach(usedExercise => {
        const foundIndex = combinedOptions.findIndex(
          availableExercise => availableExercise.name === usedExercise.name
        )
        if (foundIndex >= 0) combinedOptions.splice(foundIndex, 1, usedExercise)
        else combinedOptions.push(usedExercise)
      })
    }
  }

  const [exerciseOptions, setExerciseOptions] = React.useState<Partial<Exercise>[]>(combinedOptions)

  // useEffect(() => {
  //   console.log('useEffect')
  //   if (availableExercises) {
  //     const combinedOptions = [...availableExercises]
  //     if (usedExercises) {
  //       // setExerciseOptions([...exerciseOptions, ...usedExercises.map(exercise => ({}))])
  //       usedExercises.forEach(usedExercise => {
  //         const foundIndex = exerciseOptions.findIndex(
  //           availableExercise => availableExercise.exerciseId === usedExercise.exerciseId
  //         )
  //         if (foundIndex >= 0) combinedOptions.splice(foundIndex, 1, usedExercise)
  //         else combinedOptions.push(usedExercise)
  //       })
  //     }
  //     setExerciseOptions(combinedOptions)
  //   }
  // }, [availableExercises, exerciseOptions, usedExercises])

  const onSubmit = (data: FormData) => {
    if (data.exercise?.exerciseId) {
      onSelect(data.exercise.exerciseId)
    } else {
      const newExercise = {
        exerciseId: uuidv4(),
        name: data.exercise?.name || '',
        muscle: data.exercise?.muscle || ''
      }
      addExercise(newExercise)
      onSelect(newExercise.exerciseId)
    }

    // onSelect({
    //   exerciseId: uuidv4(),
    //   name: data.exercise?.name || '',
    //   muscle: data.exercise?.muscle || ''
    // })
    navigation.goBack()
  }

  useEffect(() => {
    // console.log('errors', errors)
    // console.log('isValid', isValid)
    // console.log('selectedExercise', selectedExercise)
  })

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)}>
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <View>
        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, value } }) => (
            <SelectList
              items={exerciseOptions}
              onValueChange={onChange}
              value={value}
              style={tw``}
              stringify={item => (item as Exercise).name}
              keyExtractor={(item, index) => `${(item as Exercise).name}.${index}`}
            />
          )}
          name="exercise"
        />
      </View>
    </>
  )
}

ExerciseSelect.defaultProps = {
  exerciseId: undefined,
  usedExercises: undefined
}
