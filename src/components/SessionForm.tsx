import { AntDesign } from '@expo/vector-icons'
import { add, differenceInMinutes } from 'date-fns'
import React, { useRef } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import 'react-native-get-random-values'
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise, Program, Session } from '../types'
import { spaceReplace } from '../utils'
import ActivitiesInput from './ActivitiesInput'
import ButtonContainer from './ButtonContainer'
import Card from './Card'
import CardInfo from './CardInfo'
import DoubleConfirm from './DoubleConfirm'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import ModalSelectInput from './ModalSelectInput'
import TextInput from './TextInput'
import { AlertText, PrimaryText, primaryTextColor, SpecialText } from './Typography'

type Props = {
  changeHandler: (programId: string, session: Session) => void
  program: Program
  session?: Session
  sessions?: Session[]
  exercises?: Exercise[]
  deleteHandler?: (programId: string, sessionId: string) => void
  goBack: () => void
}

export default function SessionForm({
  changeHandler,
  program,
  session,
  sessions,
  exercises,
  deleteHandler,
  goBack
}: Props) {
  const {
    control,
    watch,
    handleSubmit,
    setValue,
    getValues,
    formState: { isDirty, errors, dirtyFields }
  } = useForm<Partial<Session>>({
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
      program.programId,
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
    goBack()
  }

  const watchedName = watch('name')
  const [sessionTemplate, setSessionTemplate] = React.useState<Session>()
  const didTemplateUpdate = useRef(false)

  React.useEffect(() => {
    if (sessionTemplate && !watchedName && !didTemplateUpdate.current) {
      didTemplateUpdate.current = true
      setValue('name', sessionTemplate.name, { shouldDirty: true })
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
        <ButtonContainer
          onPress={handleSubmit(onSubmit)}
          disabled={!fromType && !session}
          style={tw`py-4 -my-4 px-4 -mr-4`}
        >
          <SpecialText style={tw`font-bold`}>Save</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer style={tw`py-4 -my-4 px-4 -ml-4`} onPress={goBack}>
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 114 : -225}
        behavior="padding"
      >
        <ScrollView style={tw`flex-1 pt-9`} contentContainerStyle={tw`pb-48`}>
          {!session && sessions && sessions.length > 0 && (
            <Card style={tw`flex-row justify-evenly mb-9`}>
              <View
                style={tw.style(
                  'items-stretch w-1/2  dark:border-slate-700 border-slate-400 -my-0',
                  fromType === 'Scratch'
                    ? 'border-0 mt-0 opacity-100'
                    : 'border-0 border-r-0 bg-slate-300 dark:bg-slate-600 opacity-40',
                  !fromType ? 'border-r-2' : undefined
                )}
              >
                <ButtonContainer
                  style={tw`items-start px-3 self-stretch py-1.5`}
                  onPress={() => {
                    setFromType('Scratch')
                  }}
                  disabled={!!fromType && isDirty}
                >
                  <PrimaryText>From Scratch</PrimaryText>
                </ButtonContainer>
              </View>
              <View
                style={tw.style(
                  'items-end w-1/2 dark:border-slate-700 border-slate-200 -my-0',
                  fromType === 'Template'
                    ? 'border-0 mt-0 opacity-100 '
                    : 'border-0 border-l-0 bg-slate-300 dark:bg-slate-600 opacity-40'
                )}
              >
                <ModalSelectInput
                  style={tw`bg-transparent`}
                  value="From Template"
                  textStyle={tw.style('web:text-base -mr-5', primaryTextColor)}
                  modalScreen="SessionSelectModal"
                  modalParams={{
                    modalSelectId: `${program.programId}.addSession`,
                    programId: program.programId
                  }}
                  // eslint-disable-next-line react/jsx-no-useless-fragment
                  rightIcon={<></>}
                  beforeNavigation={() => {
                    didTemplateUpdate.current = false
                  }}
                  onChangeSelect={(value: Session) => {
                    if (
                      !sessionTemplate ||
                      sessionTemplate.sessionId !== value.sessionId ||
                      didTemplateUpdate.current === false
                    ) {
                      setFromType('Template')
                      setSessionTemplate(value)
                    }
                  }}
                  disabled={!!fromType && isDirty}
                />
              </View>
            </Card>
          )}
          {(fromType || session || !sessions || sessions.length === 0) && (
            <Animated.View
              entering={FadeInUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
              exiting={FadeOutDown.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
            >
              <Controller
                name="name"
                control={control}
                rules={{
                  required: true
                }}
                render={({ field: { onChange, ref, onBlur, value } }) => (
                  <TextInput
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    label="Session Name"
                    innerRef={ref}
                    maxLength={25}
                    style={tw`mb-9`}
                    textInputStyle={tw``}
                    error={errors.name ? 'Session Name is required' : undefined}
                  />
                )}
              />

              <ActivitiesInput
                {...{
                  fieldArray,
                  control,
                  watch,
                  getValues,
                  setValue,
                  exercises,
                  session,
                  program,
                  errors,
                  dirtyFields
                }}
              />
            </Animated.View>
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
                        add(session.start, { minutes: Number(newValue) })) ||
                        ''
                    )
                  }
                  onBlur={onBlur}
                  value={
                    value && session.start && String(differenceInMinutes(value, session.start))
                  }
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
            <DoubleConfirm
              first={<CardInfo style={tw``} alertText="Delete This Session" />}
              second={
                <LinkButton
                  to={{
                    screen: 'ProgramDetailScreen',
                    params: { programId: program.programId, sessionId: session.sessionId }
                  }}
                  beforeNavigation={() => deleteHandler(program.programId, session.sessionId)}
                >
                  <AlertText style={tw`px-3 py-3 -my-3`}>
                    <AntDesign name="minuscircle" size={15} />
                  </AlertText>
                </LinkButton>
              }
            />
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
