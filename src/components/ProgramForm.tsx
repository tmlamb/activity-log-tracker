import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Program } from '../types'
import { spaceReplace } from '../utils'
import ButtonContainer from './ButtonContainer'
import DoubleConfirm from './DoubleConfirm'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import { AlertText, SecondaryText, SpecialText, ThemedTextInput, ThemedView } from './Themed'

type Props = {
  program?: Program
  changeHandler: (program: Program) => void
  deleteHandler?: (programId: string) => void
  goBack: () => void
}

export default function ProgramForm({ program, changeHandler, deleteHandler, goBack }: Props) {
  type FormData = Pick<Program, 'name'>
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      name: program?.name
    }
  })

  const onSubmit = (data: FormData) => {
    changeHandler(
      program
        ? { ...program, name: spaceReplace(data.name) }
        : {
            name: spaceReplace(data.name),
            programId: uuidv4(),
            sessions: []
          }
    )
    goBack()
  }

  const isEdit = !!program

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)} style={tw``}>
          <SpecialText style={tw`font-bold`}>Save</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer onPress={goBack} style={tw``}>
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <View style={tw`pt-9`}>
        <Controller
          name="name"
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, ref, onBlur, value } }) => (
            <ThemedTextInput
              onChangeText={onChange}
              onBlur={onBlur}
              innerRef={ref}
              value={value}
              label="Program Name"
              textInputStyle={tw`pl-32`}
              maxLength={25}
              error={errors.name ? 'Program Name is required' : undefined}
            />
          )}
        />
        {!isEdit && (
          <SecondaryText style={tw`text-xs px-3 pt-1.5`}>
            {`Give your workout program a name, like 'Strength Training', 'Weightlifting', or 'Beach Bod 🏖️'`}
          </SecondaryText>
        )}
        {isEdit && deleteHandler && (
          <DoubleConfirm
            style={tw`mt-9`}
            first={
              <ThemedView>
                <AlertText>Delete This Program</AlertText>
              </ThemedView>
            }
            second={
              <ButtonContainer
                onPress={() => {
                  deleteHandler(program.programId)
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
      </View>
    </>
  )
}

ProgramForm.defaultProps = {
  program: undefined,
  deleteHandler: undefined
}
