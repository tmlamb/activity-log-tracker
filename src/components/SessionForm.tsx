import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ScrollView } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Exercise, Session } from '../types'
import { isToday } from '../utils'
import ActivitiesInput from './ActivitiesInput/ActivitiesInput'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import NavigationLink from './Navigation/NavigationLink'
import TextInput from './TextInput'
import { SpecialText } from './Typography'

type Props = {
  changeHandler: (programId: string, session: Session) => void
  programId: string
  session?: Session
  exercises?: Exercise[]
  deleteHandler?: (programId: string, sessionId: string) => void
}

export default function SessionForm({
  changeHandler,
  programId,
  session,
  exercises,
  deleteHandler
}: Props) {
  const navigation = useNavigation()

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<Partial<Session>>({
    defaultValues: {
      name: (session && session.name) || '',
      start: (session && session.start) || new Date(),
      activities: (session && session.activities) || []
    }
  })

  const onSubmit = (data: Partial<Session>) => {
    console.log(data)
    changeHandler(
      programId,
      session
        ? {
            name: data.name!,
            sessionId: session.sessionId!,
            activities: data.activities!,
            start: data.start!,
            end: session.end!
          }
        : {
            name: data.name!,
            sessionId: uuidv4(),
            activities: data.activities!,
            start: data.start!,
            end: undefined
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
      <ScrollView style={tw`flex flex-col`}>
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
              placeholder="Session Name"
              maxLength={25}
              style={tw`mb-9`}
              textInputStyle={tw`w-full`}
            />
          )}
          name="name"
        />

        <ActivitiesInput {...{ control, getValues, setValue, exercises }} />

        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { value } }) => (
            <CardInfo
              primaryText="Date"
              secondaryText={isToday(value) ? 'Today' : value!.toLocaleDateString()}
              style={tw`mb-9`}
            />
          )}
          name="start"
        />
        {session && deleteHandler && (
          <NavigationLink
            navigationParams={{ programId, sessionId: session.sessionId }}
            screen="ProgramDetailScreen"
            callback={() => deleteHandler(programId, session.sessionId)}
          >
            <CardInfo style={tw``} alertText="Delete This Session" />
          </NavigationLink>
        )}
      </ScrollView>
    </>
  )
}

SessionForm.defaultProps = {
  session: undefined,
  deleteHandler: undefined,
  exercises: undefined
}
