import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { tw } from '../tailwind'
import { Activity, Exercise, Program, Session, WarmupSet, WorkoutSet } from '../types'
import { round5, stringifyLoad } from '../utils'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import TextInput from './TextInput'

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
}

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
  exercise,
  updateWorkoutSet
}: Props) {
  const warmupPercent =
    workoutSet.type === 'Warm-up'
      ? warmupPercentages[activity.warmupSets.length][
          activity.warmupSets.indexOf(workoutSet as WarmupSet)
        ]
      : 0

  const workPercent =
    workoutSet.type === 'Main' && activity.load.type === 'PERCENT' ? activity.load.value : 0

  const targetWeight =
    exercise.oneRepMax && round5(exercise.oneRepMax.value * (warmupPercent || workPercent))

  const weightPreset = targetWeight ? String(targetWeight) : undefined

  const { control, watch, handleSubmit } = useForm<WorkoutSet>({
    defaultValues: {
      workoutSetId: workoutSet.workoutSetId,
      type: workoutSet.type,
      actualWeight: workoutSet.actualWeight,
      actualReps: workoutSet.actualReps,
      start: workoutSet && workoutSet.start,
      end: workoutSet && workoutSet.end
    }
  })

  const onSubmit = React.useCallback(
    (data: WorkoutSet) => {
      updateWorkoutSet(program.programId, session.sessionId, activity.activityId, {
        ...workoutSet,
        actualWeight: data.actualWeight,
        actualReps: data.actualReps
      })
    },
    [activity.activityId, program.programId, session.sessionId, updateWorkoutSet, workoutSet]
  )

  React.useEffect(() => {
    const subscription = watch(() => handleSubmit(onSubmit)())
    return () => subscription.unsubscribe()
  }, [handleSubmit, onSubmit, watch])

  return (
    <>
      {/* <HeaderRightContainer>
      </HeaderRightContainer> */}
      <CardInfo
        style={tw`border-b-2 rounded-t-xl`}
        primaryText="Exercise"
        secondaryText={exercise.name}
      />
      {workoutSet.type === 'Warm-up' ? (
        <>
          <CardInfo
            style={tw`rounded-b-xl mb-9`}
            primaryText="Warm-up Load"
            secondaryText={`${String(warmupPercent * 100)}%${
              targetWeight ? ` / ${targetWeight}lbs` : ''
            }`}
          />
          {/* <CardInfo
            style={tw`border-b-0 rounded-b-xl mb-9`}
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
              activity.load.type === 'PERCENT' && targetWeight ? ` / ${targetWeight}lbs` : ''
            }`}
          />
          <CardInfo
            style={tw`border-b-0 rounded-b-xl mb-9`}
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
          <TextInput
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
            value={value ? String(value.value) : weightPreset}
            placeholder="0"
            maxLength={4}
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
            style={tw`rounded-b-xl mb-9`}
            textInputStyle={tw`text-right web:text-base`}
            labelStyle={tw`web:text-base`}
            keyboardType="number-pad"
            numeric
          />
        )}
        name="actualReps"
      />
      <ButtonContainer
        onPress={() =>
          // append({
          //   warmupSets: [],
          //   mainSets: Array.from(Array(3)).map(() => ({ workoutSetId: uuidv4(), type: 'Main' })),
          //   reps: 3,
          //   load: { type: 'PERCENT', value: 0.775 },
          //   rest: 3,
          //   activityId: uuidv4()
          // })
          console.log('completeddd')
        }
      >
        <CardInfo
          // leftIcon={
          //   <SpecialText>
          //     <AntDesign name="pluscircle" size={16} />
          //   </SpecialText>
          // }
          specialText="Complete Set"
          style={tw`rounded-xl`}
          reverse
        />
      </ButtonContainer>
    </>
  )
}
