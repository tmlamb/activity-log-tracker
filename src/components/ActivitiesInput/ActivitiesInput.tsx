import { AntDesign } from '@expo/vector-icons'
import React, { useCallback, useState } from 'react'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { ClassInput } from 'twrnc/dist/esm/types'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../../tailwind'
import { Activity, Exercise } from '../../types'
import ButtonContainer from '../ButtonContainer'
import Card from '../Card'
import CardInfo from '../CardInfo'
import NavigationLink from '../Navigation/NavigationLink'
import SimpleTextInput from '../SimpleTextInput'
import { AlertText, SecondaryText, SpecialText } from '../Typography'
import SimpleModalSelectInput from './SimpleModalSelectInput'

type Props = {
  onChange: (event: Partial<Activity>[]) => void
  onBlur: (e: unknown) => void
  value?: Partial<Activity>[]
  style?: ClassInput
}

export default function ActivitiesInput({ onChange, onBlur, value, style }: Props) {
  const [activities, setActivities] = useState<Partial<Activity>[]>(value || [])

  const handleChange = useCallback(
    (change: Partial<Activity>[]) => {
      setActivities(change)
      onChange(change)
    },
    [onChange]
  )

  const addActivity = () => {
    setActivities([
      ...activities,
      {
        warmupSets: 0,
        workSets: 3,
        reps: 3,
        load: { type: 'PERCENT', value: 77.5 },
        rest: 3,
        activityId: uuidv4()
      }
    ])
  }
  const removeActivity = (index: number) => {
    setActivities(activities.slice(0, index).concat(activities.slice(index + 1)))
  }

  return (
    <View style={tw.style(style)}>
      {activities.map((activity, index) => (
        <Card
          key={activity.activityId}
          style={tw`flex flex-row items-center justify-between px-4 border-b-2`}
        >
          <View style={tw`flex flex-row items-center justify-start w-1/2 pr-1`}>
            <ButtonContainer onPress={() => removeActivity(index)}>
              <AlertText style={tw`p-2 -ml-2`}>
                <AntDesign name="minuscircle" size={16} />
              </AlertText>
            </ButtonContainer>
            <NavigationLink
              screen="ExerciseSelectModal"
              navigationParams={{
                exercise: activity.exercise,
                onSelect: (exercise: Exercise) => null
              }}
              style={tw`flex flex-row items-center justify-start`}
            >
              <SpecialText style={tw`px-2 text-lg tracking-tight web:text-base`}>
                {activity.exercise ? activity.exercise?.name : 'Select Exercise'}
              </SpecialText>
            </NavigationLink>
            <SecondaryText style={tw`pt-0.5`}>
              <AntDesign name="right" size={16} />
            </SecondaryText>
          </View>
          <View style={tw`flex flex-col items-stretch justify-between w-1/2`}>
            <SimpleTextInput
              label="Warmup Sets"
              onChangeText={text => {
                handleChange(
                  activities.map(
                    item =>
                      (item.activityId === activity.activityId
                        ? {
                            ...activity,
                            warmupSets: text ? Number(text) : undefined
                          }
                        : undefined) || item
                  )
                )
              }}
              onBlur={onBlur}
              value={activity.warmupSets?.toString()}
              placeholder="0"
              maxLength={2}
              textAlign="right"
              style={tw`py-0 border-b-2 border-l-2`}
              textInputStyle={tw`px-0 pb-2.5 pt-3 web:text-base`}
              labelStyle={tw`px-2 web:text-base`}
              keyboardType="number-pad"
              selectTextOnFocus
              clearTextOnFocus
              numeric
            />
            <SimpleTextInput
              label="Work Sets"
              onChangeText={text => {
                handleChange(
                  activities.map(
                    item =>
                      (item.activityId === activity.activityId
                        ? {
                            ...activity,
                            workSets: text ? Number(text) : undefined
                          }
                        : undefined) || item
                  )
                )
              }}
              onBlur={onBlur}
              value={activity.workSets?.toString()}
              placeholder="0"
              maxLength={2}
              textAlign="right"
              style={tw`py-0 border-b-2 border-l-2`}
              textInputStyle={tw`px-0 py-2.5 web:text-base`}
              labelStyle={tw`px-2 web:text-base`}
              keyboardType="number-pad"
              selectTextOnFocus
              clearTextOnFocus
              numeric
            />
            <SimpleTextInput
              label="Repetitions"
              onChangeText={text => {
                handleChange(
                  activities.map(
                    item =>
                      (item.activityId === activity.activityId
                        ? {
                            ...activity,
                            reps: text ? Number(text) : undefined
                          }
                        : undefined) || item
                  )
                )
              }}
              onBlur={onBlur}
              value={activity.reps?.toString()}
              placeholder="0"
              maxLength={2}
              textAlign="right"
              style={tw`py-0 border-b-2 border-l-2`}
              textInputStyle={tw`px-0 py-2.5 web:text-base`}
              labelStyle={tw`px-2 web:text-base`}
              keyboardType="number-pad"
              selectTextOnFocus
              clearTextOnFocus
              numeric
            />
            <SimpleModalSelectInput
              label="Load"
              value={activity.load}
              style={tw`py-2 pl-2 pr-0 border-b-2 border-l-2`}
              textStyle={tw`web:text-base`}
              screen="LoadFormModal"
              navigationParams={{
                load: activity.load,
                activityId: activity.activityId!,
                onSelect: v => {
                  handleChange(
                    activities.map(
                      item =>
                        (item.activityId === activity.activityId
                          ? {
                              ...activity,
                              load: v
                            }
                          : undefined) || item
                    )
                  )
                }
              }}
              stringify={v => (v.type === 'PERCENT' ? `${v.value}%` : `RPE ${v.value}`)}
            />
            <SimpleTextInput
              label="Rest (minutes)"
              onChangeText={text => {
                handleChange(
                  activities.map(
                    item =>
                      (item.activityId === activity.activityId
                        ? {
                            ...activity,
                            rest: text ? Number(text) : undefined
                          }
                        : undefined) || item
                  )
                )
              }}
              onBlur={onBlur}
              value={activity.rest?.toString()}
              placeholder="0"
              maxLength={2}
              textAlign="right"
              style={tw`py-0 border-l-2`}
              textInputStyle={tw`px-0 py-2.5 web:text-base`}
              labelStyle={tw`px-2 web:text-base`}
              selectTextOnFocus
              clearTextOnFocus
              keyboardType="number-pad"
              numeric
            />
          </View>
        </Card>
      ))}
      <ButtonContainer onPress={() => addActivity()}>
        <CardInfo
          leftIcon={
            <SpecialText>
              <AntDesign name="pluscircle" size={16} />
            </SpecialText>
          }
          primaryText="Plan Workout Activity"
          style={tw`py-2.5`}
        />
      </ButtonContainer>
    </View>
  )
}

ActivitiesInput.defaultProps = {
  value: undefined,
  style: undefined
}
