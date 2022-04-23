import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { tw } from '../tailwind'
import { Activity, Exercise, Program, Session, WarmupSet, WorkSet } from '../types'
import CardInfo from './CardInfo'
import NavigationLink from './Navigation/NavigationLink'
import { SessionFormLink } from './ProgramDetail'
import SimpleSectionList from './SimpleSectionList'
import { SecondaryText } from './Typography'

type Props = {
  program: Program
  session: Session
  exercises: Exercise[]
}

type SetCardProps =
  | {
      set: WarmupSet
      activity: Activity
      session: Session
      program: Program
      index: number
    }
  | {
      set: WorkSet
      activity: Activity
      session: Session
      program: Program
      index: number
    }

function SetCard({ set, activity, session, program, index }: SetCardProps) {
  // console.log(set)
  // console.log(index)
  const title = `${set.type} Set ${index + 1}`
  return (
    <NavigationLink
      screen="WorkoutSetDetailScreen"
      navigationParams={{
        title,
        programId: program.programId,
        sessionId: session.sessionId,
        activityId: activity.activityId,
        workoutSetId: set.workoutSetId
      }}
    >
      <CardInfo
        primaryText={title}
        specialText={
          index === 0 && (set.type === 'Warm-up' || activity.warmupSets.length === 0)
            ? 'Ready'
            : undefined
        }
        rightIcon={
          <SecondaryText>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        }
        textStyle={tw`web:text-base web:sm:text-lg `}
        style={tw.style(
          'border-b-2',
          index === 0 && (set.type === 'Warm-up' || activity.warmupSets.length === 0)
            ? 'rounded-t-xl'
            : undefined,
          index === activity.workSets.length - 1 && set.type === 'Work'
            ? 'rounded-b-xl border-b-0 mb-9'
            : undefined
        )}
      />
    </NavigationLink>
  )
}
export default function SessionDetail({ program, session, exercises }: Props) {
  // This process maps the workout set data by activity for the section list.
  const sections: { title: string; data: SetCardProps[] }[] = Array.from(
    session.activities,
    activity => ({
      title: `${exercises.find(exercise => exercise.exerciseId === activity.exerciseId)!.name}`,
      data: [
        ...activity.warmupSets.map((set, index) => ({
          set,
          activity,
          session,
          program,
          index
        })),
        ...activity.workSets.map((set, index) => ({
          set,
          activity,
          session,
          program,
          index
        }))
      ]
    })
  )

  return (
    <>
      {/* <HeaderRightContainer>
      </HeaderRightContainer> */}

      <SessionFormLink programId={program.programId} sessionId={session.sessionId}>
        <CardInfo
          style={tw`border-b-2 rounded-t-xl`}
          primaryText={session.name}
          specialText="Edit"
        />
      </SessionFormLink>
      <CardInfo style={tw`rounded-b-xl mb-9`} specialText="Start Workout Session" reverse />

      <SimpleSectionList
        style={tw`mb-32`}
        sections={sections}
        // sections={[{ title: 'Today', data: [{ name: 'foo' }] }]}
        keyExtractor={(item, index) => `${index}`}
        renderItem={({ index, item, section }) => (
          // eslint-disable-next-line react/jsx-props-no-spreading
          <SetCard {...(item as SetCardProps)} />
          // I wouldn't spread but typescript complains about this... not sure why:
          // <SetCard
          //   set={(item as SetCardProps).set}
          //   activity={(item as SetCardProps).activity}
          //   session={(item as SetCardProps).session}
          //   program={(item as SetCardProps).program}
          //   index={(item as SetCardProps).index}
          // />
        )}
      />
    </>
  )
}
