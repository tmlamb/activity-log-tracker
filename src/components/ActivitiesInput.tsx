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
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise, MainSet, Program, Session, WarmupSet, WorkoutSet } from '../types'
import { recentActivityByExercise, stringifyLoad } from '../utils'
import ButtonContainer from './ButtonContainer'
import Card from './Card'
import CardInfo from './CardInfo'
import ModalSelectInput from './ModalSelectInput'
import TextInput from './TextInput'
import { AlertText, SpecialText } from './Typography'

type Props = {
  fieldArray: UseFieldArrayReturn<Partial<Session>, 'activities', 'id'>
  control: Control<Partial<Session>, object>
  watch: UseFormWatch<Partial<Session>>
  setValue: UseFormSetValue<Partial<Session>>
  exercises?: Exercise[]
  session?: Session
  program: Program
  errors?: FieldErrorsImpl<DeepRequired<Partial<Session>>>
  dirtyFields: FieldNamesMarkedBoolean<Partial<Session>>
}

const numberToWorkoutSetArray = <T extends WorkoutSet>(
  length: number,
  current: T[],
  type: 'Warmup' | 'Main'
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
            status: 'Planned',
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
  const { fields, append, remove } = fieldArray
  const watchActivities = watch('activities')
  return (
    <View style={tw`mb-9`}>
      {fields.map((item, index) => (
        <Animated.View
          key={item.activityId}
          entering={FadeInUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
          exiting={FadeOutUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
        >
          <Card style={tw`flex-row justify-between border-b-2`}>
            <View style={tw`flex-initial relative justify-evenly w-1/2`}>
              <Controller
                name={`activities.${index}.exerciseId`}
                control={control}
                rules={{
                  required: true
                }}
                render={({ field: { ref, onChange, value } }) => (
                  <ModalSelectInput
                    modalScreen="ExerciseSelectModal"
                    modalParams={{
                      value: exercises?.find(exercise => exercise.exerciseId === value),
                      modalSelectId: `${item.activityId}.exerciseId`
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
                        selectedExercise?.oneRepMax &&
                        watchActivities &&
                        !watchActivities[index].load
                      ) {
                        setValue(`activities.${index}.load`, { type: 'PERCENT', value: 0.75 })
                      } else if (
                        !selectedExercise?.oneRepMax &&
                        watchActivities &&
                        (watchActivities[index].load?.type === 'PERCENT' ||
                          !watchActivities[index].load)
                      ) {
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
                              ? watchActivities[index].warmupSets
                              : [],
                            'Warmup'
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
                              ? watchActivities[index].mainSets
                              : [],
                            'Main'
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
                    textStyle={tw``}
                    placeholder="Select Exercise"
                    style={tw``}
                    value={exercises?.find(exercise => exercise.exerciseId === value)?.name}
                    innerRef={ref}
                    error={
                      errors &&
                      errors.activities &&
                      errors.activities[index] &&
                      errors?.activities[index]?.exerciseId
                        ? 'Required'
                        : undefined
                    }
                    errorStyle={tw``}
                  />
                )}
              />
              <ButtonContainer
                style={tw`top-1 left-2 p-1   absolute`}
                onPress={() => remove(index)}
              >
                <AlertText style={tw``}>
                  <AntDesign name="minuscircle" size={15} />
                </AlertText>
              </ButtonContainer>
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
                  <TextInput
                    label="Warmup Sets"
                    onChangeText={v => {
                      const newLength = Number(v)
                      onChange(
                        numberToWorkoutSetArray<WarmupSet>(
                          newLength,
                          watchActivities && watchActivities[index]
                            ? watchActivities[index].warmupSets
                            : [],
                          'Warmup'
                        )
                      )
                    }}
                    onBlur={onBlur}
                    value={value.length ? String(value.length) : undefined}
                    placeholder="0"
                    maxLength={1}
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 pr-6 pb-2.5 pt-3 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
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
                  // minLength: 1,
                  // maxLength: 9
                }}
                render={({ field: { onChange, ref, onBlur, value } }) => (
                  <TextInput
                    label="Main Sets"
                    onChangeText={v => {
                      const newLength = Number(v)
                      onChange(
                        numberToWorkoutSetArray<MainSet>(
                          newLength,
                          watchActivities && watchActivities[index]
                            ? watchActivities[index].mainSets
                            : [],
                          'Main'
                        )
                      )
                    }}
                    onBlur={onBlur}
                    value={value ? String(value.length) : undefined}
                    innerRef={ref}
                    placeholder="0"
                    maxLength={2}
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 py-2.5 pr-6 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                    error={
                      errors &&
                      errors.activities &&
                      errors.activities[index] &&
                      errors?.activities[index]?.mainSets
                        ? '*'
                        : undefined
                    }
                    errorStyle={tw`bottom-0 right-2.5 top-1`}
                  />
                )}
              />
              <Controller
                name={`activities.${index}.reps`}
                control={control}
                defaultValue={3}
                rules={{
                  required: true,
                  min: 1,
                  max: 99
                }}
                render={({ field: { onChange, ref, onBlur, value } }) => (
                  <TextInput
                    label="Repetitions"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value ? String(value) : undefined}
                    innerRef={ref}
                    placeholder="0"
                    maxLength={2}
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 py-2.5 pr-6 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                    error={
                      errors &&
                      errors.activities &&
                      errors.activities[index] &&
                      errors?.activities[index]?.reps
                        ? '*'
                        : undefined
                    }
                    errorStyle={tw`bottom-0 right-2.5 top-1`}
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
                  <TextInput
                    label="Rest (minutes)"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={String(value)}
                    placeholder="0"
                    maxLength={2}
                    style={tw`py-0  border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 py-2.5 pr-6 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
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
                    style={tw`py-2 pl-2 pr-2 border-l-2`}
                    value={value && stringifyLoad(value)}
                    textStyle={tw`web:text-base`}
                    modalScreen="LoadFormModal"
                    modalParams={{
                      value,
                      exerciseId:
                        (watchActivities && watchActivities[index].exerciseId) || undefined,
                      modalSelectId: `${item.activityId}.load`
                    }}
                    onChangeSelect={v => onChange(v)}
                  />
                )}
                name={`activities.${index}.load`}
              />
            </View>
          </Card>
        </Animated.View>
      ))}
      <Animated.View layout={Layout.duration(1000).springify().damping(6).mass(0.3).stiffness(50)}>
        <CardInfo
          leftIcon={
            <ButtonContainer
              style={tw`py-5 pr-14`}
              onPress={() =>
                append({
                  activityId: uuidv4()
                })
              }
            >
              <SpecialText style={tw``}>
                <AntDesign style={tw``} name="pluscircle" size={16} />
                &nbsp;&nbsp;Add Exercise
              </SpecialText>
            </ButtonContainer>
          }
          textStyle={tw``}
          style={tw`py-5`}
        />
      </Animated.View>
    </View>
  )
}

ActivitiesInput.defaultProps = {
  exercises: undefined,
  session: undefined,
  errors: undefined
}
