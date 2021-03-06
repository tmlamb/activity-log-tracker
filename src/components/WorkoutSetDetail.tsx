import { useNavigation } from '@react-navigation/native'
import { add, subMinutes } from 'date-fns'
import _ from 'lodash'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ScrollView, View } from 'react-native'
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated'
import useWorkoutStore from '../hooks/use-workout-store'
import tw from '../tailwind'
import { Activity, Exercise, Program, Session, WarmupSet, WorkoutSet } from '../types'
import { recentActivityByExercise, round5, stringifyLoad } from '../utils'
import ButtonContainer from './ButtonContainer'
import Card from './Card'
import CardInfo from './CardInfo'
import ElapsedTime from './ElapsedTime'
import PlateChart from './PlateChart'
import TextInput from './TextInput'
import { PrimaryText, SecondaryText } from './Typography'

type Props = {
  program: Program
  session: Session
  activity: Activity
  workoutSet: WorkoutSet
  exercise: Exercise
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet
  ) => void
  updateSession: (programId: string, session: Session) => void
}

// Defined warmup set percentages in relation to one rep max based on number of warmup sets.
const warmupPercentages: { [key: number]: number[] } = {
  1: [0.6],
  2: [0.4, 0.6],
  3: [0.4, 0.5, 0.6],
  4: [0.4, 0.5, 0.6, 0.7],
  5: [0.3, 0.4, 0.5, 0.6, 0.7]
}

const isNextWorkoutSet = (workoutSet: WorkoutSet, activity: Activity) => {
  const nextPlannedWorkoutSet = [...activity.warmupSets, ...activity.mainSets].find(ws =>
    ['Planned', 'Ready'].includes(ws.status)
  )

  return nextPlannedWorkoutSet && nextPlannedWorkoutSet.workoutSetId === workoutSet.workoutSetId
}

export function FeedbackSelectInput({
  value,
  onSelect
}: {
  value: 'Easy' | 'Neutral' | 'Hard'
  onSelect: (value: 'Easy' | 'Neutral' | 'Hard') => void
}) {
  return (
    <Card style={tw`flex-row rounded-xl justify-evenly mt-9`}>
      <View
        style={tw.style(
          'items-center w-1/3 rounded-l-xl dark:border-slate-700 border-slate-300 bg-sky-300 dark:bg-sky-400',
          value === 'Easy' ? 'border-0 opacity-100' : 'border-2 opacity-40'
        )}
      >
        <ButtonContainer
          style={tw`items-center self-stretch py-1.5`}
          onPress={() => onSelect('Easy')}
        >
          <PrimaryText>Easy</PrimaryText>
        </ButtonContainer>
      </View>
      <View
        style={tw.style(
          'items-center w-1/3 dark:border-slate-700 border-slate-300',
          value === 'Neutral' ? 'border-0 opacity-100' : 'border-2 opacity-40'
        )}
      >
        <ButtonContainer
          style={tw`items-center self-stretch py-1.5`}
          onPress={() => onSelect('Neutral')}
        >
          <PrimaryText>Neutral</PrimaryText>
        </ButtonContainer>
      </View>
      <View
        style={tw.style(
          'items-center w-1/3 dark:border-slate-700 border-slate-300 bg-red-300 rounded-r-xl dark:bg-red-400',
          value === 'Hard' ? 'border-0 opacity-100' : 'border-2 opacity-40'
        )}
      >
        <ButtonContainer
          style={tw`items-center self-stretch py-1.5`}
          onPress={() => onSelect('Hard')}
        >
          <PrimaryText>Hard</PrimaryText>
        </ButtonContainer>
      </View>
    </Card>
  )
}

export default function WorkoutSetDetail({
  program,
  session,
  activity,
  workoutSet,
  exercise,
  updateWorkoutSet,
  updateSession
}: Props) {
  const navigation = useNavigation()

  const warmupPercent =
    workoutSet.type === 'Warmup'
      ? warmupPercentages[activity.warmupSets.length][
          activity.warmupSets.indexOf(workoutSet as WarmupSet)
        ]
      : 0

  const workPercent =
    workoutSet.type === 'Main' && activity.load.type === 'PERCENT' ? activity.load.value : 0

  const workoutSetIndex =
    workoutSet.type === 'Warmup'
      ? activity.warmupSets.findIndex(
          warmupSet => warmupSet.workoutSetId === workoutSet.workoutSetId
        )
      : activity.mainSets.findIndex(mainSet => mainSet.workoutSetId === workoutSet.workoutSetId)

  const recentActivity = recentActivityByExercise(program, exercise.exerciseId, session, activity)

  const setArray = recentActivity?.[`${workoutSet.type === 'Warmup' ? 'warmupSets' : 'mainSets'}`]

  const similarSet = setArray?.[workoutSetIndex] || _.last<WorkoutSet>(setArray)

  const weight = similarSet?.actualWeight?.value || 0

  const targetWeight = exercise.oneRepMax
    ? round5(exercise.oneRepMax.value * (warmupPercent || workPercent))
    : weight

  const { control, watch, handleSubmit, setValue } = useForm<WorkoutSet>({
    defaultValues: {
      actualWeight:
        (workoutSet.actualWeight && workoutSet.actualWeight.value > 0) ||
        workoutSet.status === 'Done'
          ? workoutSet.actualWeight
          : { value: targetWeight, unit: 'lbs' },
      actualReps: workoutSet.actualReps || activity.reps,
      start: workoutSet.start,
      end: workoutSet.end,
      status: workoutSet.status,
      feedback: workoutSet.feedback
    }
  })

  const isStartable =
    workoutSet.status === 'Planned' &&
    [...activity.warmupSets, ...activity.mainSets].find(ws =>
      ['Planned', 'Ready'].includes(ws.status)
    )?.workoutSetId === workoutSet.workoutSetId

  const onSubmit = React.useCallback(
    (data: WorkoutSet) => {
      updateWorkoutSet(program.programId, session.sessionId, activity.activityId, {
        ...workoutSet,
        actualWeight: data.actualWeight,
        actualReps: data.actualReps,
        start: data.start,
        end:
          data.end &&
          data.start &&
          ((subMinutes(data.end, 20).getTime() > data.start.getTime() &&
            add(data.start, { minutes: 20 })) ||
            data.end),
        status: data.status,
        feedback: data.feedback
      })
    },
    [activity.activityId, program.programId, session.sessionId, updateWorkoutSet, workoutSet]
  )

  const actualWeightWatcher = watch('actualWeight')

  React.useEffect(() => {
    const subscription = watch(() => handleSubmit(onSubmit)())
    return () => subscription.unsubscribe()
  }, [handleSubmit, onSubmit, watch])

  return (
    <ScrollView style={tw`flex-grow px-3 pt-9`} contentContainerStyle={tw`pb-48`}>
      {(isStartable && (
        <ButtonContainer
          style={tw`mb-9`}
          onPress={() => {
            setValue('start', new Date())
            setValue('status', 'Ready')
            handleSubmit(onSubmit)

            // TODO: Need a better way to handle getting updated state from a nested object..
            const latestSession = useWorkoutStore
              .getState()
              .programs.find(p => p.programId === program.programId)
              ?.sessions.find(s => s.sessionId === session.sessionId)

            if (session.status === 'Planned') {
              updateSession(program.programId, {
                ...latestSession!,
                status: 'Ready',
                start: new Date()
              })
            }
          }}
        >
          <CardInfo specialText={`Start ${workoutSet.type} Set`} style={tw`rounded-xl`} reverse />
        </ButtonContainer>
      )) ||
        (workoutSet.status === 'Ready' && (
          <ButtonContainer
            style={tw`mb-9`}
            onPress={() => {
              const now = new Date()
              setValue('end', now)
              setValue('status', 'Done')
              handleSubmit(onSubmit)

              const nextWorkoutSet = [...activity.warmupSets, ...activity.mainSets].find(
                (ws, index, obj) =>
                  obj[index - 1] && obj[index - 1].workoutSetId === workoutSet.workoutSetId
              )
              if (nextWorkoutSet && nextWorkoutSet.status === 'Planned') {
                updateWorkoutSet(program.programId, session.sessionId, activity.activityId, {
                  ...nextWorkoutSet,
                  start: now,
                  status: 'Ready'
                })
              }

              navigation.goBack()
            }}
          >
            <CardInfo
              specialText={`Complete ${workoutSet.type} Set`}
              style={tw`rounded-xl`}
              reverse
            />
          </ButtonContainer>
        ))}
      <CardInfo
        style={tw.style(
          workoutSet.type === 'Main' || exercise.oneRepMax
            ? 'border-b-2 rounded-t-xl'
            : 'rounded-xl'
        )}
        primaryText="Exercise"
        secondaryText={exercise.name}
      />
      {workoutSet.type === 'Warmup' && exercise.oneRepMax && (
        <CardInfo
          style={tw`rounded-b-xl`}
          primaryText="Warmup Load"
          secondaryText={`${String(warmupPercent * 100)}%${
            targetWeight ? ` / ${targetWeight}lbs` : ''
          }`}
        />
      )}
      {workoutSet.type === 'Main' && (
        <>
          <CardInfo
            style={tw`border-b-2`}
            primaryText="Target Load"
            secondaryText={`${stringifyLoad(activity.load)}${
              activity.load.type === 'PERCENT' && targetWeight ? ` / ${targetWeight}lbs` : ''
            }`}
          />
          <CardInfo
            style={tw`border-b-2`}
            primaryText="Target Reps"
            secondaryText={String(activity.reps)}
          />
          <CardInfo
            primaryText="Target Rest"
            secondaryText={activity.rest > 0 ? `${String(activity.rest)} minutes` : 'No rest'}
            style={tw`rounded-b-xl`}
          />
        </>
      )}

      {workoutSet.status !== 'Planned' && (
        <Animated.View
          entering={FadeInUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
          exiting={FadeOutDown.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
          style={tw`mt-9`}
        >
          {(targetWeight === 0 && workoutSet.type === 'Warmup' && (
            <SecondaryText style={tw`text-xs px-3 pb-1.5`}>
              {`Future workout sessions will prepopulate Actual Weight with the values from previous similar sets, if available, based on:\
               \n\t- Target Load\
                \n\t- Target Reps\
                 \n\t- Number of Planned Main Sets`}
            </SecondaryText>
          )) ||
            (workoutSet.type === 'Main' && program.sessions.length < 4 && (
              <>
                <SecondaryText style={tw`text-xs px-3 pb-1.5`}>
                  Try to find a weight that will cause you to meet the target RPE. Recall:
                </SecondaryText>
                <View style={tw`flex-row flex-wrap items-center justify-start ml-7`}>
                  <SecondaryText style={tw`mb-0 text-xs`}>
                    10 - another rep would have been impossible
                  </SecondaryText>
                </View>
                <View style={tw`flex-row flex-wrap items-center justify-start ml-7`}>
                  <SecondaryText style={tw`mb-0 text-xs`}>
                    9 - you left one in the tank
                  </SecondaryText>
                </View>
                <View style={tw`flex-row flex-wrap items-center justify-start ml-7`}>
                  <SecondaryText style={tw`mb-0 text-xs`}>
                    8 - you could have done a couple more
                  </SecondaryText>
                </View>
                <View style={tw`flex-row flex-wrap items-center justify-start ml-7`}>
                  <SecondaryText style={tw`mb-1.5 text-xs`}>etc...</SecondaryText>
                </View>
              </>
            ))}
          <Controller
            control={control}
            rules={{
              required: true,
              min: 1
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Actual Weight (lbs)"
                onChangeText={newValue => {
                  onChange({
                    value: Number(newValue),
                    unit: 'lbs'
                  })
                }}
                onBlur={() => {
                  handleSubmit(onSubmit)
                  onBlur()
                }}
                value={value ? String(value.value) : undefined}
                placeholder="0"
                maxLength={4}
                style={tw`border-b-2 rounded-t-xl`}
                textInputStyle={tw`text-right web:text-base`}
                labelStyle={tw`web:text-base`}
                keyboardType="number-pad"
                numeric
                selectTextOnFocus
              />
            )}
            name="actualWeight"
          />

          <Controller
            control={control}
            rules={{
              required: true,
              min: 1
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Actual Reps"
                onChangeText={onChange}
                onBlur={() => {
                  handleSubmit(onSubmit)
                  onBlur()
                }}
                value={value ? String(value) : undefined}
                placeholder="0"
                maxLength={2}
                style={tw`border-b-2`}
                textInputStyle={tw`text-right web:text-base`}
                labelStyle={tw`web:text-base`}
                keyboardType="number-pad"
                numeric
                selectTextOnFocus
              />
            )}
            name="actualReps"
          />
          <ElapsedTime
            start={workoutSet.start || new Date()}
            end={workoutSet.end}
            status={workoutSet.status}
          />

          {workoutSet.type === 'Main' && (
            <Controller
              name="feedback"
              control={control}
              rules={{
                required: true
              }}
              render={({ field: { value } }) => (
                <FeedbackSelectInput
                  value={value}
                  onSelect={feedback => {
                    setValue('feedback', feedback)
                    handleSubmit(onSubmit)
                  }}
                />
              )}
            />
          )}
        </Animated.View>
      )}
      {workoutSet.status === 'Planned' && !isNextWorkoutSet(workoutSet, activity) && (
        <SecondaryText style={tw`pl-3 text-xs mt-9`}>
          Complete the previous Workout Sets for this Exercise before continuing.
        </SecondaryText>
      )}
      {actualWeightWatcher && actualWeightWatcher.value > 0 && (
        <PlateChart style={tw`px-3 mt-9`} totalWeight={actualWeightWatcher} />
      )}
    </ScrollView>
  )
}
