import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import {
  Control,
  Controller,
  DeepRequired,
  FieldErrorsImpl,
  UseFieldArrayReturn,
  UseFormSetValue,
  UseFormWatch
} from 'react-hook-form'
import { View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Exercise, MainSet, Session, WarmupSet } from '../types'
import { stringifyLoad } from '../utils'
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
  errors?: FieldErrorsImpl<DeepRequired<Partial<Session>>>
}

export default function ActivitiesInput({
  fieldArray,
  control,
  watch,
  setValue,
  exercises,
  session,
  errors
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
                      if (
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
                rules={{
                  validate: value => !value || (value.length >= 0 && value.length <= 5)
                }}
                render={({ field: { onChange, ref, onBlur, value } }) => (
                  <TextInput
                    label="Warmup Sets"
                    onChangeText={v => {
                      const newLength = Number(v)
                      const newValue = [...value]
                      if (newLength < value.length) {
                        newValue.splice(newLength, newValue.length - newLength)
                      } else if (newLength > newValue.length) {
                        newValue.push(
                          ...Array.from(Array(newLength - newValue.length)).map(
                            () =>
                              ({
                                workoutSetId: uuidv4(),
                                type: 'Warmup',
                                status: 'Planned'
                              } as WarmupSet)
                          )
                        )
                      }
                      onChange(newValue)
                    }}
                    onBlur={onBlur}
                    value={String(value.length)}
                    innerRef={ref}
                    placeholder="0"
                    maxLength={2}
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 pr-6 pb-2.5 pt-3 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                    error={
                      errors &&
                      errors.activities &&
                      errors.activities[index] &&
                      errors?.activities[index]?.warmupSets
                        ? `Required`
                        : undefined
                    }
                    // errorStyle={tw``}
                  />
                )}
              />
              <Controller
                control={control}
                rules={{
                  required: true,
                  minLength: 1,
                  maxLength: 5
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Main Sets"
                    onChangeText={v => {
                      const newLength = Number(v)
                      const newValue = [...value]
                      if (newLength < value.length) {
                        newValue.splice(newLength, newValue.length - newLength)
                      } else if (newLength > newValue.length) {
                        newValue.push(
                          ...Array.from(Array(newLength - newValue.length)).map(
                            () =>
                              ({
                                workoutSetId: uuidv4(),
                                type: 'Main',
                                status: session?.status === 'Done' ? 'Done' : 'Planned',
                                start: session?.status === 'Done' ? session.end : undefined,
                                end: session?.status === 'Done' ? session.end : undefined,
                                feedback: 'Neutral'
                              } as MainSet)
                          )
                        )
                      }
                      onChange(newValue)
                    }}
                    onBlur={onBlur}
                    value={String(value.length)}
                    placeholder="0"
                    maxLength={2}
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 py-2.5 pr-6 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                  />
                )}
                name={`activities.${index}.mainSets`}
              />
              <Controller
                control={control}
                rules={{
                  required: true
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Repetitions"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={String(value)}
                    placeholder="0"
                    maxLength={2}
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 py-2.5 pr-6 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                  />
                )}
                name={`activities.${index}.reps`}
              />
              <Controller
                control={control}
                rules={{
                  required: true
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
                name={`activities.${index}.rest`}
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
                  warmupSets: Array.from(Array(3)).map(() => ({
                    workoutSetId: uuidv4(),
                    type: 'Warmup',
                    status: session?.status === 'Done' ? 'Done' : 'Planned',
                    start: session?.status === 'Done' ? session.end : undefined,
                    end: session?.status === 'Done' ? session.end : undefined,
                    feedback: 'Neutral'
                  })),
                  mainSets: Array.from(Array(3)).map(() => ({
                    workoutSetId: uuidv4(),
                    type: 'Main',
                    status: session?.status === 'Done' ? 'Done' : 'Planned',
                    start: session?.status === 'Done' ? session.end : undefined,
                    end: session?.status === 'Done' ? session.end : undefined,
                    feedback: 'Neutral'
                  })),
                  reps: 3,
                  load: undefined,
                  rest: 3,
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
