import { useNavigation } from '@react-navigation/native'
import { add } from 'date-fns'
import React from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { KeyboardAvoidingView, ScrollView, View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise, Session } from '../types'
import { spaceReplace } from '../utils'
import ActivitiesInput from './ActivitiesInput'
import ButtonContainer from './ButtonContainer'
import Card from './Card'
import CardInfo from './CardInfo'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import ModalSelectInput from './ModalSelectInput'
import TextInput from './TextInput'
import { PrimaryText, primaryTextColor, SpecialText } from './Typography'

type Props = {
  changeHandler: (programId: string, session: Session) => void
  programId: string
  session?: Session
  sessions?: Session[]
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
  sessions,
  exercises,
  deleteHandler
}: Props) {
  const navigation = useNavigation()

  const { control, watch, handleSubmit, setValue, getValues } = useForm<Partial<Session>>({
    defaultValues: {
      name: (session && session.name) || '',
      end: (session && session.end) || undefined,
      activities: (session && session.activities) || []
    }
  })
  const fieldArray = useFieldArray({
    control,
    name: 'activities'
  })

  const [fromType, setFromType] = React.useState<'Scratch' | 'Template' | undefined>()

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

  const watchedName = watch('name')
  const [sessionTemplate, setSessionTemplate] = React.useState<Session>()

  React.useEffect(() => {
    if (sessionTemplate && !watchedName) {
      setValue('name', sessionTemplate.name)
      sessionTemplate.activities.forEach(activity => {
        fieldArray.append({
          ...activity,
          warmupSets: Array.from(Array(activity.warmupSets.length)).map(() => ({
            workoutSetId: uuidv4(),
            type: 'Warmup',
            status: 'Planned',
            start: undefined,
            end: undefined,
            feedback: 'Neutral'
          })),
          mainSets: Array.from(Array(activity.mainSets.length)).map(() => ({
            workoutSetId: uuidv4(),
            type: 'Main',
            status: 'Planned',
            start: undefined,
            end: undefined,
            feedback: 'Neutral'
          })),
          activityId: uuidv4()
        })
      })
    }
  }, [fieldArray, sessionTemplate, setValue, watchedName])

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
          {!session && sessions && sessions.length > 0 && (
            <Card style={tw`flex-row justify-evenly mb-9`}>
              <View
                style={tw.style(
                  'items-stretch w-1/2  dark:border-slate-700 border-slate-200 ',
                  fromType === 'Scratch'
                    ? 'border-0 opacity-100'
                    : 'border-2 border-r-0 -py-2 -px-2 bg-slate-300 dark:bg-slate-300 opacity-40'
                )}
              >
                <ButtonContainer
                  style={tw`items-center self-stretch py-1.5`}
                  onPress={() => {
                    if (!fromType) {
                      setFromType('Scratch')
                    }
                  }}
                >
                  <PrimaryText>From Scratch</PrimaryText>
                </ButtonContainer>
              </View>
              <View
                style={tw.style(
                  'items-center w-1/2 dark:border-slate-700 border-slate-200',
                  fromType === 'Template'
                    ? 'border-0 opacity-100 '
                    : 'border-2 border-l-0 -py-2 -px-2 bg-slate-300 dark:bg-slate-300 opacity-40'
                )}
              >
                <ModalSelectInput
                  style={tw`items-center bg-transparent`}
                  label="From Template"
                  labelPosition="center"
                  textStyle={tw.style('web:text-base', primaryTextColor)}
                  modalScreen="SessionSelectModal"
                  modalParams={{
                    modalSelectId: `${programId}.addSession`,
                    programId
                  }}
                  // eslint-disable-next-line react/jsx-no-useless-fragment
                  rightIcon={<></>}
                  onChangeSelect={(value: Session) => {
                    if (value) {
                      setFromType('Template')
                      setSessionTemplate(value)
                    }
                  }}
                  disabled={!!fromType}
                />
              </View>
            </Card>
          )}
          {(fromType || session || !sessions || sessions.length === 0) && (
            <>
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

              <ActivitiesInput
                {...{
                  fieldArray,
                  control,
                  watch,
                  getValues,
                  setValue,
                  exercises,
                  session
                }}
              />
            </>
          )}
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
            <LinkButton
              to={{
                screen: 'ProgramDetailScreen',
                params: { programId, sessionId: session.sessionId }
              }}
              beforeNavigation={() => deleteHandler(programId, session.sessionId)}
            >
              <CardInfo style={tw``} alertText="Delete This Session" />
            </LinkButton>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

SessionForm.defaultProps = {
  session: undefined,
  deleteHandler: undefined,
  sessions: undefined,
  exercises: undefined
}
