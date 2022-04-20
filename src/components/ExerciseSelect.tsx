import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { LogBox, View } from 'react-native'
import { tw } from '../tailwind'
import { Exercise } from '../types'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import { ActivityNavigationProp } from './Navigation/ActivityDetailScreen'
import { ExerciseSelectNavigationProp } from './Navigation/ExerciseSelectModal'
import { LoadFormNavigationProp } from './Navigation/LoadFormModal'
import { ProgramNavigationProp } from './Navigation/ProgramDetailScreen'
import { ProgramFormNavigationProp } from './Navigation/ProgramFormModal'
import { SessionNavigationProp } from './Navigation/SessionDetailScreen'
import { SessionFormNavigationProp } from './Navigation/SessionFormModal'
import { PrimaryText, SpecialText } from './Typography'

// TODO: Address problem with non-serializable navigation prop (see onSelect function), then remove this ignore statement
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state'])

type Props = {
  exercise?: Exercise
  exercises: Exercise[]
  onSelect: (exercise: Exercise) => void
}

type FormData = {
  exercise: Exercise | undefined
}

export default function LoadForm({ exercise, exercises, onSelect }: Props) {
  const navigation = useNavigation<
    | ProgramNavigationProp
    | SessionNavigationProp
    | ActivityNavigationProp
    | ProgramFormNavigationProp
    | SessionFormNavigationProp
    | LoadFormNavigationProp
    | ExerciseSelectNavigationProp
  >()
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setValue
  } = useForm<FormData>({
    defaultValues: {
      exercise
    }
  })
  const type = watch('exercise')

  const onSubmit = (data: FormData) => {
    onSelect(data.exercise!)
    navigation.goBack()
  }

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)} disabled={!isValid}>
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
            // <SimplePicker
            //   label="Load Type"
            //   items={[
            //     { label: 'RPE', value: 'RPE', color: tw.style(primaryTextColor).color as string },
            //     {
            //       label: 'Percent',
            //       value: 'PERCENT',
            //       color: tw.style(primaryTextColor).color as string
            //     }
            //   ]}
            //   onValueChange={onChange}
            //   value={value}
            //   style={tw`px-4 mb-9`}
            // />
            <PrimaryText>Pick an exercise</PrimaryText>
          )}
          name="exercise"
        />
      </View>
    </>
  )
}

LoadForm.defaultProps = {
  exercise: undefined
}
