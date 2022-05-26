import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import {
  Control,
  Controller,
  useFieldArray,
  UseFormGetValues,
  UseFormSetValue,
  UseFormWatch
} from 'react-hook-form'
import { View } from 'react-native'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../../tailwind'
import { Exercise, Session, WarmupSet, WorkSet } from '../../types'
import { stringifyLoad } from '../../utils'
import ButtonContainer from '../ButtonContainer'
import Card from '../Card'
import CardInfo from '../CardInfo'
import NavigationLink from '../Navigation/NavigationLink'
import TextInput from '../TextInput'
import { AlertText, SecondaryText } from '../Typography'
import ModalSelectInput from './ModalSelectInput'
// import NestedArray from './nestedFieldArray'

const renderCount = 0

type Props = {
  control: Control<Partial<Session>, unknown>
  watch: UseFormWatch<Partial<Session>>
  setValue: UseFormSetValue<Partial<Session>>
  getValues: UseFormGetValues<Partial<Session>>
  exercises?: Exercise[]
}

export default function ActivitiesInput({ control, watch, setValue, getValues, exercises }: Props) {
  const { fields, append, remove, prepend } = useFieldArray({
    control,
    name: 'activities'
  })

  const watchActivities = watch('activities')

  // renderCount += 1

  return (
    <>
      <View style={tw`mb-9`}>
        {fields.map((item, index) => (
          <Card key={item.activityId} style={tw`flex-row justify-between border-b-2`}>
            <View style={tw`flex-initial justify-evenly w-1/2`}>
              {/* <ButtonContainer onPress={() => remove(index)}>
                <AlertText style={tw`p-2 -mx-2 `}>
                  <AntDesign name="minuscircle" size={16} />
                </AlertText>
              </ButtonContainer> */}
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
                    textStyle={tw``}
                    placeholder="Select Exercise"
                    style={tw` pl-2`}
                    stringify={exerciseId =>
                      exercises!.find(exercise => exercise.exerciseId === exerciseId)!.name
                    }
                    // stringify={() => 'This is a test of how very super-overwhelmingly test sucks!!'}
                  />
                )}
                name={`activities.${index}.exerciseId`}
              />
              <ButtonContainer style={tw`self-start mx-3 pb-2.5`} onPress={() => remove(index)}>
                {/* <AlertText style={tw`mr-3`}>
                  <AntDesign name="minuscircle" size={16} />
                </AlertText> */}
                <AlertText>Remove Activity</AlertText>
              </ButtonContainer>
              {watchActivities![index].exerciseId && (
                <NavigationLink
                  screen="ExerciseFormModal"
                  navigationParams={{ exerciseId: watchActivities![index].exerciseId }}
                  style={tw`items-center flex-row mx-auto mb-2.5`}
                >
                  <CardInfo
                    style={tw`p-0 px-1.5 border-2 border-r-0 items-center`}
                    textStyle={tw`text-base`}
                    primaryText="1RM (lbs)"
                  />
                  <CardInfo
                    style={tw`p-0 px-1.5 border-2 border-l-0`}
                    textStyle={tw`text-base`}
                    secondaryText={String(
                      exercises?.find(
                        exercise => exercise.exerciseId === watchActivities![index].exerciseId
                      )?.oneRepMax?.value || 'Edit'
                    )}
                    rightIcon={
                      <SecondaryText style={tw` -my-1`}>
                        <AntDesign name="right" style={tw``} size={10} />
                      </SecondaryText>
                    }
                  />
                </NavigationLink>
              )}
            </View>
            <View style={tw`justify-between flex-initial w-1/2`}>
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
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 pb-2.5 pt-3 text-right web:text-base`}
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
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 py-2.5 text-right web:text-base`}
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
                    style={tw`py-0 border-b-2 border-l-2`}
                    textInputStyle={tw`pl-0 py-2.5 text-right web:text-base`}
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
                    style={tw`py-2 pl-2 pr-2.5 border-b-2 border-l-2`}
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
                    style={tw`py-0 border-l-2`}
                    textInputStyle={tw`pl-0 py-2.5 text-right web:text-base`}
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
            // leftIcon={
            //   <SpecialText>
            //     <AntDesign name="pluscircle" size={16} />
            //   </SpecialText>
            // }
            specialText="Add Activity"
            style={tw``}
            reverse
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
