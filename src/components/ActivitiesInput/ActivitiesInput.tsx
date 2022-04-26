import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import {
  Control,
  Controller,
  useFieldArray,
  UseFormGetValues,
  UseFormSetValue
} from 'react-hook-form'
import { View } from 'react-native'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../../tailwind'
import { Exercise, Session, WarmupSet, WorkSet } from '../../types'
import { stringifyLoad } from '../../utils'
import ButtonContainer from '../ButtonContainer'
import Card from '../Card'
import CardInfo from '../CardInfo'
import TextInput from '../TextInput'
import { AlertText, SpecialText } from '../Typography'
import ModalSelectInput from './ModalSelectInput'
// import NestedArray from './nestedFieldArray'

let renderCount = 0

type Props = {
  control: Control<Partial<Session>, unknown>
  setValue: UseFormSetValue<Partial<Session>>
  getValues: UseFormGetValues<Partial<Session>>
  exercises?: Exercise[]
}

export default function ActivitiesInput({ control, setValue, getValues, exercises }: Props) {
  // console.log('exercises', exercises)
  const { fields, append, remove, prepend } = useFieldArray({
    control,
    name: 'activities'
  })

  renderCount += 1

  return (
    <>
      <View style={tw`mb-9`}>
        {fields.map((item, index) => (
          <Card
            key={item.activityId}
            style={tw`flex flex-row items-center justify-between px-4 border-b-2`}
          >
            <View style={tw`flex flex-row items-center justify-start flex-initial w-1/2`}>
              <ButtonContainer onPress={() => remove(index)}>
                <AlertText style={tw`p-2 -mx-2 `}>
                  <AntDesign name="minuscircle" size={16} />
                </AlertText>
              </ButtonContainer>
              <Controller
                control={control}
                rules={{
                  required: true
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <ModalSelectInput
                    screen="ExerciseSelectModal"
                    value={value}
                    onChangeSelect={onChange}
                    onBlur={onBlur}
                    textStyle={tw`w-10/12 -mr-1 web:w-20 web:sm:w-44 web:md:w-64 web:lg:w-80`}
                    placeholder="Select Exercise"
                    style={tw`flex-initial`}
                    stringify={exerciseId =>
                      exercises!.find(exercise => exercise.exerciseId === exerciseId)!.name
                    }
                  />
                )}
                name={`activities.${index}.exerciseId`}
              />
            </View>
            <View style={tw`flex flex-col items-stretch justify-between flex-initial w-1/2`}>
              <Controller
                control={control}
                rules={{
                  required: false
                }}
                render={({ field: { onChange, onBlur, value } }) => (
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
                                type: 'Warm-up'
                              } as WarmupSet)
                          )
                        )
                      }
                      onChange(newValue)
                    }}
                    onBlur={onBlur}
                    value={String(value.length)}
                    placeholder="0"
                    maxLength={2}
                    textAlign="right"
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`px-0 pb-2.5 pt-3 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    clearTextOnFocus
                    numeric
                  />
                )}
                name={`activities.${index}.warmupSets`}
              />
              <Controller
                control={control}
                rules={{
                  required: true,
                  min: 1
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Work Sets"
                    // onChangeText={v => onChange(Number(v))}
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
                                type: 'Work'
                              } as WorkSet)
                          )
                        )
                      }
                      onChange(newValue)
                    }}
                    onBlur={onBlur}
                    value={String(value.length)}
                    placeholder="0"
                    maxLength={2}
                    textAlign="right"
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`px-0 py-2.5 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    clearTextOnFocus
                    numeric
                  />
                )}
                name={`activities.${index}.workSets`}
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
                    textAlign="right"
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`px-0 py-2.5 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    clearTextOnFocus
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
                  <ModalSelectInput
                    label="Load"
                    value={value}
                    style={tw`py-2 pl-2 pr-0 border-b-2 border-l-2`}
                    textStyle={tw`web:text-base`}
                    screen="LoadFormModal"
                    onChangeSelect={onChange}
                    onBlur={onBlur}
                    stringify={stringifyLoad}
                  />
                )}
                name={`activities.${index}.load`}
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
                    textAlign="right"
                    style={tw`py-0 border-l-2`}
                    textInputStyle={tw`px-0 py-2.5 text-right web:text-base`}
                    labelStyle={tw`px-2 web:text-base`}
                    selectTextOnFocus
                    clearTextOnFocus
                    keyboardType="number-pad"
                    numeric
                  />
                )}
                name={`activities.${index}.rest`}
              />
            </View>
          </Card>
        ))}
        <ButtonContainer
          onPress={() =>
            append({
              warmupSets: [],
              workSets: Array.from(Array(3)).map(() => ({ workoutSetId: uuidv4(), type: 'Work' })),
              reps: 3,
              load: { type: 'PERCENT', value: 0.775 },
              rest: 3,
              activityId: uuidv4()
            })
          }
        >
          <CardInfo
            leftIcon={
              <SpecialText>
                <AntDesign name="pluscircle" size={16} />
              </SpecialText>
            }
            primaryText="Plan Workout Activity"
            style={tw``}
          />
        </ButtonContainer>
      </View>

      {/* <span className="counter">Render Count: {renderCount}</span> */}
    </>
  )
}

ActivitiesInput.defaultProps = {
  exercises: undefined
}
