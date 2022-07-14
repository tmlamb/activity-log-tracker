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
import { Exercise, MainSet, Session, WarmupSet } from '../../types'
import { stringifyLoad } from '../../utils'
import ButtonContainer from '../ButtonContainer'
import Card from '../Card'
import CardInfo from '../CardInfo'
import TextInput from '../TextInput'
import { AlertText, SpecialText } from '../Typography'
import ModalSelectInput from './ModalSelectInput'

type Props = {
  control: Control<Partial<Session>, object>
  watch: UseFormWatch<Partial<Session>>
  setValue: UseFormSetValue<Partial<Session>>
  getValues: UseFormGetValues<Partial<Session>>
  exercises?: Exercise[]
  session?: Session
}

export default function ActivitiesInput({
  control,
  watch,
  setValue,
  getValues,
  exercises,
  session
}: Props) {
  const { fields, append, remove, prepend } = useFieldArray({
    control,
    name: 'activities'
  })

  const watchActivities = watch('activities')

  return (
    <View style={tw`mb-9`}>
      {fields.map((item, index) => (
        <Card key={item.activityId} style={tw`flex-row justify-between border-b-2`}>
          <View style={tw`flex-initial relative justify-evenly w-1/2`}>
            <Controller
              control={control}
              rules={{
                required: true
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <ModalSelectInput
                  modalScreen="ExerciseSelectModal"
                  value={exercises?.find(exercise => exercise.exerciseId === value)}
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

                    onChange(selectedExercise.exerciseId)
                  }}
                  textStyle={tw``}
                  placeholder="Select Exercise"
                  style={tw``}
                  stringify={exercise => exercise.name}
                />
              )}
              name={`activities.${index}.exerciseId`}
            />
            <ButtonContainer
              // style={tw`p-1 mr-2.5 mt-1.5 top-0 right-0 absolute`}
              style={tw`py-2 pr-2 pl-1 ml-2 mt-0 top-0 left-0 absolute`}
              onPress={() => remove(index)}
            >
              <AlertText style={tw``}>
                <AntDesign name="minuscircle" size={16} />
              </AlertText>
            </ButtonContainer>
          </View>
          <View style={tw`justify-between flex-initial w-1/2`}>
            <Controller
              control={control}
              rules={{
                validate: value => !value || (value.length >= 0 && value.length <= 5)
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
                  placeholder="0"
                  maxLength={2}
                  style={tw`py-0 border-b-2 border-l-2`}
                  textInputStyle={tw`pl-0 pr-6 pb-2.5 pt-3 text-right web:text-base`}
                  labelStyle={tw`px-2 web:text-base`}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  numeric
                />
              )}
              name={`activities.${index}.warmupSets`}
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
                <ModalSelectInput
                  label="Load"
                  value={value}
                  style={tw`py-2 pl-2 pr-2.5 border-b-2 border-l-2`}
                  textStyle={tw`web:text-base`}
                  modalScreen="LoadFormModal"
                  modalParams={{
                    exerciseId: (watchActivities && watchActivities[index].exerciseId) || undefined
                  }}
                  onChangeSelect={onChange}
                  stringify={v => v && stringifyLoad(v)}
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
                  textInputStyle={tw`pl-0 py-2.5 pr-6 text-right web:text-base`}
                  labelStyle={tw`px-2 web:text-base`}
                  selectTextOnFocus
                  keyboardType="number-pad"
                  numeric
                />
              )}
              name={`activities.${index}.rest`}
            />
          </View>
        </Card>
      ))}
      <CardInfo
        leftIcon={
          <ButtonContainer
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
            <SpecialText style={tw`py-3.5`}>
              <AntDesign style={tw``} name="pluscircle" size={16} />
              &nbsp;&nbsp;Add Activity
            </SpecialText>
          </ButtonContainer>
        }
        // primaryText="Add Activity"
        textStyle={tw``}
        style={tw`py-5`}
      />
    </View>
  )
}

ActivitiesInput.defaultProps = {
  exercises: undefined,
  session: undefined
}
