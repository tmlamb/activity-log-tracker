import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Program } from '../types'
import { spaceReplace } from '../utils'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import DoubleConfirm from './DoubleConfirm'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import TextInput from './TextInput'
import { AlertText, SpecialText } from './Typography'

type Props = {
  changeHandler: (program: Program) => void
  program?: Program
  deleteHandler?: (programId: string) => void
}

type FormData = {
  name: string
}

export default function ProgramForm({ changeHandler, program, deleteHandler }: Props) {
  const navigation = useNavigation()

  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      name: (program && program.name) || ''
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
          onPress={() => {
            navigation.goBack()
          }}
          style={tw`py-4 -my-4 px-4 -ml-4`}
        >
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <View style={tw`flex-grow py-9`}>
        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              label="Program Name"
              maxLength={25}
              style={tw`mb-9`}
              textInputStyle={tw`w-full`}
            />
          )}
          name="name"
        />
        {program && deleteHandler && (
          <DoubleConfirm
            first={<CardInfo style={tw``} alertText="Delete This Program" />}
            second={
              <LinkButton
                to={{ screen: 'DashboardScreen' }}
                beforeNavigation={() => deleteHandler(program.programId)}
              >
                <AlertText style={tw`px-3 py-3 -my-3`}>
                  <AntDesign name="minuscircle" size={15} />
                </AlertText>
              </LinkButton>
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
