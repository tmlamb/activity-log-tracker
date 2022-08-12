import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import {
  Control,
  Controller,
  DeepRequired,
  FieldErrorsImpl,
  FieldNamesMarkedBoolean,
  UseFieldArrayReturn,
  UseFormSetValue,
  UseFormWatch
} from 'react-hook-form'
import { View } from 'react-native'
import Animated, { FadeInLeft, FadeOutRight, Layout } from 'react-native-reanimated'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise, MainSet, Program, Session, WarmupSet, WorkoutSet } from '../types'
import { recentActivityByExercise, stringifyLoad } from '../utils'
import ButtonContainer from './ButtonContainer'
import ModalSelectInput from './ModalSelectInput'
import { SessionFormData } from './SessionForm'
import { AlertText, SecondaryText, SpecialText, ThemedTextInput, ThemedView } from './Themed'

type Props = {
  fieldArray: UseFieldArrayReturn<SessionFormData, 'activities', 'id'>
  control: Control<SessionFormData, object>
  watch: UseFormWatch<SessionFormData>
  setValue: UseFormSetValue<SessionFormData>
  exercises?: Exercise[]
  session?: Session
  program: Program
  errors?: FieldErrorsImpl<DeepRequired<SessionFormData>>
  dirtyFields: FieldNamesMarkedBoolean<SessionFormData>
}

const numberToWorkoutSetArray = <T extends WorkoutSet>(
  length: number,
  current: T[],
  type: 'Warmup' | 'Main',
  session?: Session
): T[] => {
  const newArray = [...current]
  if (length < current.length) {
    newArray.splice(length, newArray.length - length)
  } else if (length > newArray.length) {
    newArray.push(
      ...Array.from(Array(length - newArray.length)).map(
        () =>
          ({
            workoutSetId: uuidv4(),
            type,
            status: session?.status === 'Done' ? 'Done' : 'Planned',
            start: session?.status === 'Done' ? session.end : undefined,
            end: session?.status === 'Done' ? session.end : undefined,
            feedback: 'Neutral'
          } as T)
      )
    )
  }
  return newArray
}

export default function ActivitiesInput({
  fieldArray,
  control,
  watch,
  setValue,
  exercises,
  session,
  program,
  errors,
  dirtyFields
}: Props) {
  const { fields, append, remove, swap } = fieldArray
  const watchActivities = watch('activities')
  return (
    <View style={tw`my-9`}>
      {fields.map((item, index) => (
        <Animated.View
          key={item.activityId}
          entering={FadeInLeft}
          exiting={FadeOutRight}
          layout={Layout}
        >
          <ThemedView style={tw`flex-row p-0 items-stretch border-b-2`}>
            <View style={tw`flex-initial relative justify-evenly w-1/2`}>
              <Controller
                name={`activities.${index}.exerciseId`}
                control={control}
                rules={{
                  required: true
                }}
                render={({ field: { onChange, value } }) => (
                  <ModalSelectInput
                    modalScreen="ExerciseSelectModal"
                    modalParams={{
                      value: exercises?.find(exercise => exercise.exerciseId === value),
                      modalSelectId: `${item.activityId}.exerciseId`
                    }}
                    textStyle={tw`pr-3 text-lg leading-tight`}
                    placeholder="Select Exercise"
                    value={exercises?.find(exercise => exercise.exerciseId === value)?.name}
                    accessibilityLabel="Navigate to select exercise form"
                    accessibilityValue={{
                      text: exercises?.find(exercise => exercise.exerciseId === value)?.name
                    }}
                    onChangeSelect={(selectedExercise: Exercise) => {
                      const recentActivity = recentActivityByExercise(
                        program,
                        selectedExercise.exerciseId
                      )
                      if (
                        recentActivity?.load &&
                        (!dirtyFields ||
                          !dirtyFields.activities ||
                          !dirtyFields.activities[index] ||
                          !dirtyFields?.activities[index].load)
                      ) {
                        setValue(`activities.${index}.load`, recentActivity.load)
                      } else if (
                        selectedExercise.oneRepMax &&
                        selectedExercise.oneRepMax.value > 0 &&
                        watchActivities &&
                        !watchActivities[index].load
                      ) {
                        setValue(`activities.${index}.load`, { type: 'PERCENT', value: 0.75 })
                      } else {
                        setValue(`activities.${index}.load`, { type: 'RPE', value: 5 })
                      }

                      if (
                        recentActivity?.warmupSets &&
                        (!dirtyFields ||
                          !dirtyFields.activities ||
                          !dirtyFields.activities[index] ||
                          !dirtyFields?.activities[index].warmupSets)
                      ) {
                        setValue(
                          `activities.${index}.warmupSets`,
                          numberToWorkoutSetArray<WarmupSet>(
                            recentActivity.warmupSets.length,
                            watchActivities && watchActivities[index]
                              ? watchActivities[index].warmupSets!
                              : [],
                            'Warmup',
                            session
                          )
                        )
                      }

                      if (
                        recentActivity?.mainSets &&
                        (!dirtyFields ||
                          !dirtyFields.activities ||
                          !dirtyFields.activities[index] ||
                          !dirtyFields?.activities[index].mainSets)
                      ) {
                        setValue(
                          `activities.${index}.mainSets`,
                          numberToWorkoutSetArray<MainSet>(
                            recentActivity.mainSets.length,
                            watchActivities && watchActivities[index]
                              ? watchActivities[index].mainSets!
                              : [],
                            'Main',
                            session
                          )
                        )
                      }

                      if (
                        recentActivity?.reps &&
                        (!dirtyFields ||
                          !dirtyFields.activities ||
                          !dirtyFields.activities[index] ||
                          !dirtyFields?.activities[index].reps)
                      ) {
                        setValue(`activities.${index}.reps`, recentActivity.reps)
                      }

                      if (
                        recentActivity?.rest &&
                        (!dirtyFields ||
                          !dirtyFields.activities ||
                          !dirtyFields.activities[index] ||
                          !dirtyFields?.activities[index].rest)
                      ) {
                        setValue(`activities.${index}.rest`, recentActivity.rest)
                      }

                      if (
                        selectedExercise &&
                        selectedExercise.exerciseId &&
                        selectedExercise.exerciseId !== value
                      ) {
                        onChange(selectedExercise.exerciseId)
                      }
                    }}
                    icon={
                      <SecondaryText style={tw`pr-0.5`}>
                        <AntDesign name="right" size={16} />
                      </SecondaryText>
                    }
                    error={
                      errors &&
                      errors.activities &&
                      errors.activities[index] &&
                      errors?.activities[index]?.exerciseId
                        ? 'Required'
                        : undefined
                    }
                  />
                )}
              />
              <ButtonContainer
                style={tw`top-1 left-2 p-1 absolute`}
                onPress={() => remove(index)}
                accessibilityLabel="Remove exercise from Session"
              >
                <AlertText>
                  <AntDesign name="minuscircle" size={15} />
                </AlertText>
              </ButtonContainer>
              {index !== 0 && (
                <ButtonContainer
                  style={tw`top-0 opacity-50 self-center p-2 absolute`}
                  onPress={() => swap(index, index - 1)}
                  accessibilityLabel="Swap exercise with previous exercise to change order"
                >
                  <SecondaryText>
                    <AntDesign name="caretup" size={16} />
                  </SecondaryText>
                </ButtonContainer>
              )}
              {index !== fields.length - 1 && (
                <ButtonContainer
                  style={tw`bottom-0 opacity-50 self-center p-2 absolute`}
                  onPress={() => swap(index, index + 1)}
                  accessibilityLabel="Swap exercise with next exercise to change order"
                >
                  <SecondaryText>
                    <AntDesign name="caretdown" size={16} />
                  </SecondaryText>
                </ButtonContainer>
              )}
            </View>
            <View style={tw`justify-between flex-initial w-1/2`}>
              <Controller
                name={`activities.${index}.warmupSets`}
                control={control}
                defaultValue={
                  Array.from(Array(3)).map(() => ({
                    workoutSetId: uuidv4(),
                    type: 'Warmup',
                    status: session?.status === 'Done' ? 'Done' : 'Planned',
                    start: session?.status === 'Done' ? session.end : undefined,
                    end: session?.status === 'Done' ? session.end : undefined,
                    feedback: 'Neutral'
                  })) as WarmupSet[]
                }
                rules={{
                  required: false
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Warmup Sets"
                    onChangeText={v => {
                      const newLength = Number(v)
                      onChange(
                        numberToWorkoutSetArray<WarmupSet>(
                          newLength,
                          watchActivities && watchActivities[index]
                            ? watchActivities[index].warmupSets!
                            : [],
                          'Warmup',
                          session
                        )
                      )
                    }}
                    onBlur={onBlur}
                    value={value!.length ? String(value!.length) : undefined}
                    placeholder="0"
                    maxLength={1}
                    style={tw`border-b-2 border-l-2`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                  />
                )}
              />
              <Controller
                name={`activities.${index}.mainSets`}
                control={control}
                defaultValue={
                  Array.from(Array(3)).map(() => ({
                    workoutSetId: uuidv4(),
                    type: 'Main',
                    status: session?.status === 'Done' ? 'Done' : 'Planned',
                    start: session?.status === 'Done' ? session.end : undefined,
                    end: session?.status === 'Done' ? session.end : undefined,
                    feedback: 'Neutral'
                  })) as MainSet[]
                }
                rules={{
                  required: true
                }}
                render={({ field: { onChange, ref, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Main Sets"
                    onChangeText={v => {
                      const newLength = Number(v)
                      onChange(
                        numberToWorkoutSetArray<MainSet>(
                          newLength,
                          watchActivities && watchActivities[index]
                            ? watchActivities[index].mainSets!
                            : [],
                          'Main',
                          session
                        )
                      )
                    }}
                    onBlur={onBlur}
                    value={value ? String(value.length) : undefined}
                    innerRef={ref}
                    placeholder="0"
                    maxLength={2}
                    style={tw`border-b-2 border-l-2`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                    error={
                      errors &&
                      errors.activities &&
                      errors.activities[index] &&
                      errors?.activities[index]?.mainSets
                        ? 'Required'
                        : undefined
                    }
                    errorStyle={tw`right-3 top-3.5 text-xs`}
                  />
                )}
              />
              <Controller
                name={`activities.${index}.reps`}
                control={control}
                defaultValue={3}
                rules={{
                  required: true,
                  min: 1
                }}
                render={({ field: { onChange, ref, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Repetitions"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value ? String(value) : undefined}
                    innerRef={ref}
                    placeholder="0"
                    maxLength={2}
                    style={tw`border-b-2 border-l-2`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                    error={
                      errors &&
                      errors.activities &&
                      errors.activities[index] &&
                      errors?.activities[index]?.reps
                        ? 'Required'
                        : undefined
                    }
                    errorStyle={tw`right-3 top-3.5 text-xs`}
                  />
                )}
              />
              <Controller
                name={`activities.${index}.rest`}
                control={control}
                defaultValue={3}
                rules={{
                  required: false
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="Rest (minutes)"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={String(value)}
                    placeholder="0"
                    maxLength={2}
                    style={tw`border-b-2 border-l-2`}
                    selectTextOnFocus
                    keyboardType="number-pad"
                    numeric
                  />
                )}
              />
              <Controller
                control={control}
                rules={{
                  required: true
                }}
                render={({ field: { onChange, value } }) => (
                  <ModalSelectInput
                    label="Load"
                    style={tw`border-l-2`}
                    value={value && stringifyLoad(value)}
                    textStyle={tw`pr-4`}
                    accessibilityLabel="Navigate to select exercise load form"
                    accessibilityValue={{
                      text: value && stringifyLoad(value)
                    }}
                    modalScreen="LoadFormModal"
                    modalParams={{
                      value,
                      exerciseId:
                        (watchActivities && watchActivities[index].exerciseId) || undefined,
                      modalSelectId: `${item.activityId}.load`
                    }}
                    onChangeSelect={v => onChange(v)}
                    icon={
                      <SecondaryText style={tw`pr-1`}>
                        <AntDesign name="right" size={16} />
                      </SecondaryText>
                    }
                  />
                )}
                name={`activities.${index}.load`}
              />
            </View>
          </ThemedView>
        </Animated.View>
      ))}
      <Animated.View layout={Layout}>
        <ButtonContainer
          onPress={() =>
            append(
              {
                activityId: uuidv4()
              },
              { shouldFocus: false }
            )
          }
          disabled={fields.length > 100}
        >
          <ThemedView style={tw`justify-start web:py-[7.25px] web:pb-[3.25px]`}>
            <SpecialText>
              <AntDesign name="pluscircle" size={16} />
            </SpecialText>
            <SpecialText style={tw`px-3`}>Add Exercise</SpecialText>
          </ThemedView>
        </ButtonContainer>
      </Animated.View>
    </View>
  )
}

ActivitiesInput.defaultProps = {
  exercises: undefined,
  session: undefined,
  errors: undefined
}
