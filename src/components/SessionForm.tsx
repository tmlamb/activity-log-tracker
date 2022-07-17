import { useNavigation } from '@react-navigation/native'
import { add } from 'date-fns'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { KeyboardAvoidingView, ScrollView } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise, Session } from '../types'
import { spaceReplace } from '../utils'
import ActivitiesInput from './ActivitiesInput'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderLeftContainer from './HeaderLeftContainer'
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

const dateToElapsedTime = (start: Date, end: Date) => {
  const elapsedTimeSeconds = Math.ceil((end.getTime() - start.getTime()) / 1000)

  return String(Math.floor(elapsedTimeSeconds / 60))
}

// Converts the percent string to it's numeric value. The old value is needed to detect the case where
// the value to the left of the decimal is getting deleted.
const elapsedTimeToEndDate = (start: Date, elapsedTime: string) => {
  const endDate = add(start, { minutes: Number(elapsedTime) })
  return endDate
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
    watch,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<Partial<Session>>({
    defaultValues: {
      name: (session && session.name) || '',
      end: (session && session.end) || undefined,
      activities: (session && session.activities) || []
    }
  })

  const onSubmit = (data: Partial<Session>) => {
    changeHandler(
      programId,
      session
        ? {
            name: spaceReplace(data.name!),
            sessionId: session.sessionId!,
            activities: data.activities!,
            start: session.start,
            end: data.end,
            status: session.status
          }
        : {
            name: spaceReplace(data.name!),
            sessionId: uuidv4(),
            activities: data.activities!,
            start: undefined,
            end: undefined,
            status: 'Planned'
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
          style={tw`py-4 -my-4 px-4 -ml-4`}
          onPress={() => {
            navigation.goBack()
          }}
        >
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <KeyboardAvoidingView style={tw`flex-1`} keyboardVerticalOffset={114} behavior="padding">
        <ScrollView style={tw`flex-1 pt-9`} contentContainerStyle={tw`pb-48`}>
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
                label="Session Name"
                maxLength={25}
                style={tw`mb-9`}
                textInputStyle={tw``}
              />
            )}
            name="name"
          />

          <ActivitiesInput {...{ control, watch, getValues, setValue, exercises, session }} />

          {session && session.status === 'Done' && session.start && (
            <Controller
              control={control}
              rules={{
                required: false
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Elapsed Time (minutes)"
                  onChangeText={newValue =>
                    newValue &&
                    session.start &&
                    onChange(
                      (newValue &&
                        session.start &&
                        elapsedTimeToEndDate(session.start, newValue)) ||
                        ''
                    )
                  }
                  onBlur={onBlur}
                  value={value && session.start && dateToElapsedTime(session.start, value)}
                  maxLength={3}
                  style={tw`mb-9`}
                  textInputStyle={tw`web:w-1/4`}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  numeric
                />
              )}
              name="end"
            />
          )}

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
      </KeyboardAvoidingView>
    </>
  )
}

SessionForm.defaultProps = {
  session: undefined,
  deleteHandler: undefined,
  exercises: undefined
}
