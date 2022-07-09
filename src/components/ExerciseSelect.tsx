import { useNavigation } from '@react-navigation/native'
import React from 'react'
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
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      exercise: usedExercises?.find(exercise => exerciseId === exercise.exerciseId)
    }
  })

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

    navigation.goBack()
  }

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
            <>
              {usedExercises && (
                <SelectList
                  items={usedExercises}
                  onValueChange={onChange}
                  value={value}
                  style={tw``}
                  stringify={item => (item as Exercise).name}
                  keyExtractor={(item, index) => `${(item as Exercise).name}.${index}`}
                />
              )}
              <SelectList
                items={availableExercises}
                onValueChange={onChange}
                value={value}
                style={tw``}
                stringify={item => (item as Exercise).name}
                keyExtractor={(item, index) => `${(item as Exercise).name}.${index}`}
              />
            </>
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
