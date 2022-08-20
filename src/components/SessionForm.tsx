import { AntDesign } from '@expo/vector-icons'
import { add, differenceInMinutes } from 'date-fns'
import _ from 'lodash'
import React, { useRef } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import 'react-native-get-random-values'
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Activity, Exercise, Program, Session } from '../types'
import ActivitiesInput from './ActivitiesInput'
import ButtonContainer from './ButtonContainer'
import DoubleConfirm from './DoubleConfirm'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import ModalSelectInput from './ModalSelectInput'
import {
  AlertText,
  PrimaryText,
  primaryTextColor,
  SecondaryText,
  SpecialText,
  ThemedTextInput,
  ThemedView
} from './Themed'

type Props = {
  changeHandler: (programId: string, session: Session) => void
  program: Program
  session?: Session
  sessions?: Session[]
  exercises?: Exercise[]
  deleteHandler?: (programId: string, sessionId: string) => void
  goBack: () => void
}

export type SessionFormData = {
  name: string
  sessionId: string
  start?: Date
  end?: Date
  status: 'Planned' | 'Ready' | 'Done'
  activities: Activity[]
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
    formState: { isDirty, errors, dirtyFields, touchedFields }
  } = useForm<SessionFormData>({
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

  const onSubmit = (data: SessionFormData) => {
    changeHandler(
      program.programId,
      session
        ? {
            name: data.name,
            sessionId: session.sessionId,
            activities: data.activities as Activity[],
            start: session.start,
            end: data.end,
            status: session.status
          }
        : {
            name: data.name,
            sessionId: uuidv4(),
            activities: data.activities as Activity[],
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
    // Process the session template if it has changed, populating the form with it's data
    if (sessionTemplate && !watchedName && !didTemplateUpdate.current) {
      didTemplateUpdate.current = true
      setValue('name', sessionTemplate.name, { shouldDirty: true })
      sessionTemplate.activities.forEach(activity => {
        fieldArray.append(
          {
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
          },
          { shouldFocus: false }
        )
      })
    }
  }, [fieldArray, sessionTemplate, setValue, watchedName])

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer
          onPress={handleSubmit(onSubmit)}
          disabled={!session && sessions && sessions.length > 0 && !fromType}
          accessibilityLabel="Save session and close form"
        >
          <SpecialText style={tw`font-bold`}>Save</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer onPress={goBack}>
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 114 : -225}
        behavior="padding"
      >
        <ScrollView style={tw`flex-grow`} contentContainerStyle={tw`pt-9 pb-12`}>
          {!session && sessions && sessions.length > 0 && (
            <ThemedView style={tw`justify-between p-0 mb-9`}>
              <ButtonContainer
                style={tw`flex-row items-stretch w-1/2 h-full`}
                onPress={() => {
                  setFromType('Scratch')
                }}
                disabled={!!fromType && isDirty}
                accessibilityLabel="Create new session from scratch"
              >
                <View
                  style={tw.style(
                    'px-3 w-full items-center justify-center dark:border-slate-700 border-slate-400',
                    fromType === 'Scratch'
                      ? 'border-0 opacity-100'
                      : 'border-0 border-r-0 bg-slate-300 dark:bg-slate-600 opacity-40',
                    !fromType ? 'border-r-2' : undefined
                  )}
                >
                  <PrimaryText>From Scratch</PrimaryText>
                </View>
              </ButtonContainer>
              <View
                style={tw.style(
                  'w-1/2 dark:border-slate-700 border-slate-200',
                  fromType === 'Template'
                    ? 'border-0 mt-0 opacity-100 '
                    : 'border-0 border-l-0 bg-slate-300 dark:bg-slate-600 opacity-40'
                )}
              >
                <ModalSelectInput
                  style={tw`justify-center bg-transparent`}
                  label="From Template"
                  textStyle={tw.style(primaryTextColor)}
                  accessibilityLabel="Navigate to template selection form to create new session from a template"
                  modalScreen="SessionSelectModal"
                  modalParams={{
                    modalSelectId: `${program.programId}.addSession`,
                    programId: program.programId
                  }}
                  // eslint-disable-next-line react/jsx-no-useless-fragment
                  icon={<></>}
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
            </ThemedView>
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
                  <ThemedTextInput
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    label="Session Name"
                    innerRef={ref}
                    maxLength={25}
                    textInputStyle={tw`pl-32`}
                    error={errors.name ? 'Session Name is required' : undefined}
                  />
                )}
              />
              {program.sessions.length < 3 && fromType !== 'Template' && (
                <SecondaryText style={tw`text-xs mx-3 mt-1.5`}>
                  Use a descriptive name for your workout session, like &apos;Lower Body&apos; or
                  &apos;Chest Day&apos;. You can re-use it as a template later.
                </SecondaryText>
              )}
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
                  dirtyFields,
                  touchedFields
                }}
              />
            </Animated.View>
          )}
          {session && session.status === 'Done' && session.start && (
            <Controller
              name="end"
              control={control}
              rules={{
                required: false
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedTextInput
                  label="Elapsed Time (minutes)"
                  onChangeText={newValue =>
                    onChange(session.start && add(session.start, { minutes: Number(newValue) }))
                  }
                  onBlur={onBlur}
                  value={
                    value && session.start && String(differenceInMinutes(value, session.start))
                  }
                  maxLength={3}
                  style={tw`mb-9`}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  numeric
                />
              )}
            />
          )}

          {session && deleteHandler && (
            <DoubleConfirm
              first={
                <ThemedView>
                  <AlertText>Delete This Session</AlertText>
                </ThemedView>
              }
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
              accessibilityLabel={`Delete Workout Session with name ${session.name}`}
            />
          )}

          {session && session.start && (
            <>
              <DoubleConfirm
                style={tw`mt-9`}
                first={
                  <ThemedView>
                    <AlertText>Reset This Session</AlertText>
                  </ThemedView>
                }
                second={
                  <LinkButton
                    to={{
                      screen: 'ProgramDetailScreen',
                      params: { programId: program.programId, sessionId: session.sessionId }
                    }}
                    beforeNavigation={() =>
                      changeHandler(program.programId, {
                        ...session,
                        start: undefined,
                        end: undefined,
                        status: 'Planned',
                        activities: _.map(session.activities, actvy => ({
                          ...actvy,
                          warmupSets: _.map(actvy.warmupSets, wus => ({
                            ...wus,
                            start: undefined,
                            end: undefined,
                            actualWeight: undefined,
                            actualReps: 0,
                            status: 'Planned',
                            feedback: 'Neutral'
                          })),
                          mainSets: _.map(actvy.mainSets, ms => ({
                            ...ms,
                            start: undefined,
                            end: undefined,
                            actualWeight: undefined,
                            actualReps: 0,
                            status: 'Planned',
                            feedback: 'Neutral'
                          }))
                        }))
                      })
                    }
                  >
                    <AlertText style={tw`px-3 py-3 -my-3`}>
                      <AntDesign name="minuscircle" size={15} />
                    </AlertText>
                  </LinkButton>
                }
                accessibilityLabel={`Reset Workout Session with name ${session.name}`}
              />
              <SecondaryText style={tw`text-xs mx-3 mt-1.5`}>
                Resets session to &apos;Planned&apos; state by clearing all entered Actual Weights
                and Reps and any set start and end times.
              </SecondaryText>
            </>
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
