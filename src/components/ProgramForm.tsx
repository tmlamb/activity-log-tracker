import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Program } from '../types'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import NavigationLink from './Navigation/NavigationLink'
import SimpleTextInput from './SimpleTextInput'
import { SpecialText } from './Typography'

type Props = {
  changeHandler: (program: Program) => void
  program?: Program
  deleteHandler?: (entityId: string) => void
}

type FormData = {
  name: string
}

export default function ProgramForm({ changeHandler, program, deleteHandler }: Props) {
  const navigation = useNavigation()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      name: (program && program.name) || ''
    }
  })
  const onSubmit = (data: FormData) => {
    changeHandler(
      program
        ? { ...program, name: data.name }
        : {
            name: data.name,
            programId: uuidv4(),
            sessions: []
          }
    )
    navigation.goBack()
  }

  return (
    // <Formik
    //   initialValues={{ name: (program && program.name) || '' }}
    //   onSubmit={values => {
    //     changeHandler(
    //       program
    //         ? { ...program, name: values.name }
    //         : {
    //             name: values.name,
    //             icon: 'test',
    //             programId: uuidv4(),
    //             sessions: []
    //           }
    //     )
    //     navigation.goBack()
    //   }}
    // >
    //   {({ handleSubmit, handleChange, handleBlur, values }) => (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)}>
          {/* <ButtonContainer onPress={handleSubmit as (values: unknown) => void}> */}
          <SpecialText style={tw`font-bold`}>Save</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <View style={tw`flex flex-col`}>
        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <SimpleTextInput
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              placeholder="Program Name"
              maxLength={25}
              textInputStyle={tw`w-full`}
            />
          )}
          name="name"
        />
        {program && deleteHandler && (
          <NavigationLink
            navigationParams={{ programId: program.programId }}
            screen="DashboardScreen"
            callback={() => deleteHandler(program.programId)}
          >
            <CardInfo style={tw``} alertText="Delete This Program" />
          </NavigationLink>
        )}
      </View>
    </>
  )
}

ProgramForm.defaultProps = {
  program: undefined,
  deleteHandler: undefined
}
