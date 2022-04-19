import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Activity, Session } from '../types'
import { isToday } from '../utils'
import { ActivitiesInput } from './ActivitiesInput'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import NavigationLink from './Navigation/NavigationLink'
import SimpleTextInput from './SimpleTextInput'
import { SpecialText } from './Typography'

type Props = {
  changeHandler: (programId: string, session: Session) => void
  programId: string
  session?: Session
  deleteHandler?: (programId: string, sessionId: string) => void
}

type FormData = {
  name: string
  date: Date
  activities: Activity[]
}

export default function SessionForm({ changeHandler, programId, session, deleteHandler }: Props) {
  const navigation = useNavigation()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      name: (session && session.name) || '',
      date: (session && session.start) || new Date(),
      activities: (session && session.activities) || []
    }
  })

  const onSubmit = (data: FormData) => {
    changeHandler(
      programId,
      session
        ? { ...session, name: data.name, start: data.date }
        : {
            name: data.name,
            sessionId: uuidv4(),
            activities: [],
            start: data.date,
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
              placeholder="Session Name"
              maxLength={25}
              style={tw`mb-9`}
              textInputStyle={tw`w-full`}
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
            <ActivitiesInput onChange={onChange} onBlur={onBlur} value={value} style={tw`mb-9`} />
          )}
          name="activities"
        />

        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { value } }) => (
            <CardInfo
              primaryText="Date"
              secondaryText={isToday(value) ? 'Today' : value.toLocaleDateString()}
            />
          )}
          name="date"
        />
        {session && deleteHandler && (
          <NavigationLink
            navigationParams={{ programId, sessionId: session.sessionId }}
            screen="ProgramDetailScreen"
            callback={() => deleteHandler(programId, session.sessionId)}
          >
            <CardInfo
              style={tw``}
              // primaryText={item.name}
              alertText="Delete This Session"
              // rightIcon={
              //   <SecondaryText>
              //     <AntDesign name="right" size={16} />
              //   </SecondaryText>
              // }
            />
          </NavigationLink>
        )}
      </View>
    </>
  )
}

SessionForm.defaultProps = {
  session: undefined,
  deleteHandler: undefined
}
