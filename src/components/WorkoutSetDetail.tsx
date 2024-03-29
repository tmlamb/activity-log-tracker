import { add, subMinutes } from 'date-fns'
import _ from 'lodash'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Platform, ScrollView, View } from 'react-native'
import Animated, { FadeInUp, FadeOutDown, Layout } from 'react-native-reanimated'
import tw from '../tailwind'
import { Activity, Equipment, Exercise, Program, Session, WarmupSet, WorkoutSet } from '../types'
import { recentActivityByExercise, round5, stringifyLoad } from '../utils'
import ButtonContainer from './ButtonContainer'
import ElapsedTime from './ElapsedTime'
import HeaderLeftContainer from './HeaderLeftContainer'
import PlateChart from './PlateChart'
import {
  AlertText,
  PrimaryText,
  SecondaryText,
  SpecialText,
  ThemedTextInput,
  ThemedView
} from './Themed'

type Props = {
  program: Program
  session: Session
  activity: Activity
  workoutSet: WorkoutSet
  exercise: Exercise
  equipment: Equipment
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet
  ) => void
  startSession: (programId: string, sessionId: string) => void
  goBack: () => void
}

// Defined warmup set percentages in relation to one rep max based on number of warmup sets.
const warmupPercentageMap: { [key: number]: number[] } = {
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
    <ThemedView style={tw`p-0 justify-evenly mt-9`} rounded>
      <View
        style={tw.style(
          'items-center w-1/3 rounded-l-xl dark:border-slate-700 border-slate-300 bg-sky-300 dark:bg-sky-400',
          value === 'Easy' ? 'border-0 opacity-100' : 'border-2 opacity-40'
        )}
      >
        <ButtonContainer
          style={tw`items-center self-stretch py-1.5`}
          onPress={() => onSelect('Easy')}
          accessibilityLabel="Set workout set feedback: Easy"
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
          accessibilityLabel="Set workout set feedback: Neutral"
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
          accessibilityLabel="Set workout set feedback: Hard"
        >
          <PrimaryText>Hard</PrimaryText>
        </ButtonContainer>
      </View>
    </ThemedView>
  )
}

export default function WorkoutSetDetail({
  program,
  session,
  activity,
  workoutSet,
  exercise,
  equipment,
  updateWorkoutSet,
  startSession,
  goBack
}: Props) {
  const warmupPercentages =
    warmupPercentageMap[activity.warmupSets.length] || warmupPercentageMap[5]

  const warmupPercent =
    workoutSet.type === 'Warmup'
      ? warmupPercentages[activity.warmupSets.indexOf(workoutSet as WarmupSet)] ||
        _.last(warmupPercentages) ||
        0
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
  const actualRepsWatcher = watch('actualReps')

  React.useEffect(() => {
    const subscription = watch(() => handleSubmit(onSubmit)())
    return () => subscription.unsubscribe()
  }, [handleSubmit, onSubmit, watch])

  return (
    <>
      {Platform.OS === 'web' && (
        <HeaderLeftContainer>
          <ButtonContainer onPress={goBack}>
            <SpecialText>Back</SpecialText>
          </ButtonContainer>
        </HeaderLeftContainer>
      )}
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-3 pt-9 pb-12`}>
        {(isStartable && (
          <ButtonContainer
            style={tw`mb-9`}
            onPress={() => {
              setValue('start', new Date())
              setValue('status', 'Ready')
              handleSubmit(onSubmit)

              if (session.status === 'Planned') {
                startSession(program.programId, session.sessionId)
              }
            }}
          >
            <ThemedView rounded>
              <SpecialText>{`Start ${workoutSet.type} Set`}</SpecialText>
            </ThemedView>
          </ButtonContainer>
        )) ||
          (workoutSet.status === 'Ready' && !!actualRepsWatcher && actualRepsWatcher > 0 && (
            <Animated.View
              entering={FadeInUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
              exiting={FadeOutDown.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
              style={tw``}
            >
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

                  goBack()
                }}
              >
                <ThemedView rounded>
                  <SpecialText>{`Complete ${workoutSet.type} Set`}</SpecialText>
                </ThemedView>
              </ButtonContainer>
            </Animated.View>
          ))}
        <Animated.View layout={Layout}>
          <ThemedView
            style={tw.style(
              workoutSet.type === 'Main' || exercise.oneRepMax
                ? 'border-b-2 rounded-t-xl'
                : 'rounded-xl'
            )}
          >
            <PrimaryText style={tw`pr-3`}>Exercise</PrimaryText>
            <SecondaryText style={tw`flex-1 text-right`} numberOfLines={3}>
              {exercise.name}
            </SecondaryText>
          </ThemedView>
          {workoutSet.type === 'Warmup' && exercise.oneRepMax && (
            <ThemedView style={tw`rounded-b-xl`}>
              <PrimaryText>Warmup Load</PrimaryText>
              <SecondaryText>{`${String(warmupPercent * 100)}%${
                targetWeight && workoutSet.status !== 'Done' ? ` / ${targetWeight}lbs` : ''
              }`}</SecondaryText>
            </ThemedView>
          )}
          {workoutSet.type === 'Main' && (
            <>
              <ThemedView style={tw`border-b-2`}>
                <PrimaryText>Target Load</PrimaryText>
                <SecondaryText>{`${stringifyLoad(activity.load)}${
                  activity.load.type === 'PERCENT' && targetWeight && workoutSet.status !== 'Done'
                    ? ` / ${targetWeight}lbs`
                    : ''
                }`}</SecondaryText>
              </ThemedView>
              <ThemedView style={tw`border-b-2`}>
                <PrimaryText>Target Reps</PrimaryText>
                <SecondaryText>{String(activity.reps)}</SecondaryText>
              </ThemedView>
              <ThemedView style={tw`rounded-b-xl`}>
                <PrimaryText>Target Rest</PrimaryText>
                <SecondaryText>
                  {activity.rest > 0 ? `${String(activity.rest)} minutes` : 'No rest'}
                </SecondaryText>
              </ThemedView>
            </>
          )}

          {activity.load.type === 'PERCENT' &&
            (!exercise.oneRepMax || exercise.oneRepMax.value <= 0) && (
              <AlertText style={tw`text-sm px-3 pt-1.5`}>
                Setup a One Rep Max for this exercise before using the percent load type.
              </AlertText>
            )}

          {workoutSet.status !== 'Planned' && (
            <Animated.View
              entering={FadeInUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
              exiting={FadeOutDown.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
              style={tw`mt-9`}
            >
              {workoutSet.type === 'Main' &&
                activity.load.type === 'RPE' &&
                program.sessions.length < 4 && (
                  <SecondaryText style={tw`text-sm mx-3 mb-1.5`}>
                    Find a weight that will meet the target RPE.
                  </SecondaryText>
                )}
              <Controller
                control={control}
                rules={{
                  required: true,
                  min: 1
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <ThemedTextInput
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
                  <ThemedTextInput
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
              {targetWeight === 0 && workoutSet.type === 'Warmup' && (
                <SecondaryText style={tw`text-sm mx-3 mt-1.5`}>
                  Future warmups for this exercise will pre-populate the Actual Weight with the
                  values from previous similar sets, if available.
                </SecondaryText>
              )}

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
            <SecondaryText style={tw`ml-3 text-sm mt-9`}>
              Complete the previous workout sets for this exercise before continuing.
            </SecondaryText>
          )}
          {actualWeightWatcher && actualWeightWatcher.value > 0 && (
            <PlateChart
              style={tw`mx-3 mt-9`}
              totalWeight={actualWeightWatcher}
              equipment={equipment}
            />
          )}
        </Animated.View>
      </ScrollView>
    </>
  )
}
