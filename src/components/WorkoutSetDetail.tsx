import React, { useCallback, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { tw } from '../tailwind'
import { Activity, Exercise, Program, Session, WarmupSet, WorkoutSet } from '../types'
import { round5, stringifyLoad } from '../utils'
import CardInfo from './CardInfo'
import SimpleTextInput from './SimpleTextInput'

type Props = {
  program: Program
  session: Session
  activity: Activity
  workoutSet: WorkoutSet
  exercises: Exercise[]
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet
  ) => void
}

// type SetCardProps = {
//   set: Partial<WorkoutSet>
//   activity: Activity
//   index: number
// }

// function SetCard({ set, activity, index }: SetCardProps) {
//   // console.log(set)
//   // console.log(index)
//   return (
//     <NavigationLink screen="SetDetailScreen" navigationParams={{ title: `Warm-up Set 1` }}>
//       <CardInfo
//         primaryText={`${set.type} Set ${index + 1}`}
//         secondaryText={set.type === 'Work' ? stringifyLoad(activity.load) : undefined}
//         specialText={
//           index === 0 && (set.type === 'Warm-up' || activity.warmupSets === 0) ? 'Start' : undefined
//         }
//         rightIcon={
//           <SecondaryText>
//             <AntDesign name="right" size={16} />
//           </SecondaryText>
//         }
//         textStyle={tw`web:text-base web:sm:text-lg `}
//         style={tw.style(
//           'border-b-2',
//           index === 0 && (set.type === 'Warm-up' || activity.warmupSets === 0)
//             ? 'rounded-t-xl'
//             : undefined,
//           index === activity.workSets - 1 && set.type === 'Work'
//             ? 'rounded-b-xl border-b-0 mb-9'
//             : undefined
//         )}
//       />
//     </NavigationLink>
//   )
// }

// Defined warmup set percentages in relation to one rep max based on number of warmup sets.
const warmupPercentages: { [key: number]: number[] } = {
  1: [0.5],
  2: [0.4, 0.6],
  3: [0.4, 0.5, 0.6],
  4: [0.4, 0.5, 0.6, 0.7],
  5: [0.3, 0.4, 0.5, 0.6, 0.7]
}

export default function WorkoutSetDetail({
  program,
  session,
  activity,
  workoutSet,
  exercises,
  updateWorkoutSet
}: Props) {
  const exercise = exercises.find(e => e.exerciseId === activity.exerciseId)!

  const warmupPercent =
    workoutSet.type === 'Warm-up'
      ? warmupPercentages[activity.warmupSets.length][
          activity.warmupSets.indexOf(workoutSet as WarmupSet)
        ]
      : 0

  const workPercent =
    workoutSet.type === 'Work' && activity.load.type === 'PERCENT' ? activity.load.value : 0

  const targetWeight = round5(exercise.oneRepMax!.value * (warmupPercent || workPercent))

  const {
    control,
    watch,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<WorkoutSet>({
    defaultValues: {
      workoutSetId: workoutSet.workoutSetId,
      type: workoutSet.type,
      actualWeight: workoutSet.actualWeight,
      actualReps: workoutSet.actualReps,
      start: workoutSet && workoutSet.start,
      end: workoutSet && workoutSet.end
    }
  })

  const onSubmit = useCallback(
    (data: WorkoutSet) => {
      updateWorkoutSet(program.programId, session.sessionId, activity.activityId, {
        ...workoutSet,
        actualWeight: data.actualWeight,
        actualReps: data.actualReps
      })
    },
    [activity.activityId, program.programId, session.sessionId, updateWorkoutSet, workoutSet]
  )

  useEffect(() => {
    const subscription = watch(() => handleSubmit(onSubmit)())
    return () => subscription.unsubscribe()
  }, [handleSubmit, onSubmit, watch])

  return (
    <>
      {/* <HeaderRightContainer>
      </HeaderRightContainer> */}
      <CardInfo
        style={tw`rounded-t-xl border-b-2`}
        primaryText="Exercise"
        secondaryText={exercise.name}
      />
      {workoutSet.type === 'Warm-up' ? (
        <>
          <CardInfo
            style={tw`rounded-b-xl mb-9`}
            primaryText="Warm-up Load"
            secondaryText={`${String(warmupPercent * 100)}% / ${targetWeight}lbs`}
          />
          {/* <CardInfo
            style={tw`rounded-b-xl border-b-0 mb-9`}
            primaryText="Warm-up Reps"
            secondaryText={stringifyLoad(activity.load)}
          /> */}
        </>
      ) : (
        <>
          <CardInfo
            style={tw`border-b-2`}
            primaryText="Target Load"
            secondaryText={`${stringifyLoad(activity.load)}${
              activity.load.type === 'PERCENT' ? `/ ${targetWeight}lbs` : ''
            }`}
          />
          <CardInfo
            style={tw`rounded-b-xl border-b-0 mb-9`}
            primaryText="Target Reps"
            secondaryText={String(activity.reps)}
          />
        </>
      )}

      <Controller
        control={control}
        rules={{
          required: false
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <SimpleTextInput
            label="Actual Weight (lbs)"
            onChangeText={v =>
              onChange({
                value: Number(v),
                unit: 'lbs'
              })
            }
            onBlur={() => {
              handleSubmit(onSubmit)
              onBlur()
            }}
            value={
              value
                ? String(value.value)
                : String(round5(exercise.oneRepMax!.value * (warmupPercent || workPercent)))
            }
            placeholder="0"
            maxLength={4}
            textAlign="right"
            style={tw`border-b-2 rounded-t-xl`}
            textInputStyle={tw`text-right web:text-base`}
            labelStyle={tw`web:text-base`}
            keyboardType="number-pad"
            numeric
          />
        )}
        name="actualWeight"
      />

      <Controller
        control={control}
        rules={{
          required: false
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <SimpleTextInput
            label="Actual Reps"
            onChangeText={onChange}
            onBlur={() => {
              handleSubmit(onSubmit)
              onBlur()
            }}
            value={value ? String(value) : undefined}
            placeholder="0"
            maxLength={2}
            textAlign="right"
            style={tw`rounded-b-xl`}
            textInputStyle={tw`text-right web:text-base`}
            labelStyle={tw`web:text-base`}
            keyboardType="number-pad"
            numeric
          />
        )}
        name="actualReps"
      />
      {/* 

      <SimpleSectionList
        style={tw``}
        sections={sections}
        keyExtractor={(item, index) => `${index}`}
        renderItem={({ index, item, section }) => (
          <SetCard
            set={(item as SetCardProps).set}
            activity={(item as SetCardProps).activity}
            index={(item as SetCardProps).index}
          />
        )}
      /> */}
    </>
  )
}
