import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { tw } from '../tailwind'
import { Activity, Exercise, Program, Session, WorkoutSet } from '../types'
import { stringifyLoad } from '../utils'
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

type SetCardProps = {
  set: WorkoutSet
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
        secondaryText={set.type === 'Work' ? stringifyLoad(activity.load) : undefined}
        specialText={
          index === 0 && (set.type === 'Warm-up' || activity.warmupSets === 0) ? 'Start' : undefined
        }
        rightIcon={
          <SecondaryText>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        }
        textStyle={tw`web:text-base web:sm:text-lg `}
        style={tw.style(
          'border-b-2',
          index === 0 && (set.type === 'Warm-up' || activity.warmupSets === 0)
            ? 'rounded-t-xl'
            : undefined,
          index === activity.workSets - 1 && set.type === 'Work'
            ? 'rounded-b-xl border-b-0 mb-9'
            : undefined
        )}
      />
    </NavigationLink>
  )
}
export default function SessionDetail({ program, session, exercises }: Props) {
  // console.log(session)
  // This process creates the partial workout set data based on the planned activities,
  // and arranges it for the section list.
  const sections = Array.from(session.activities, activity => ({
    title: `${exercises.find(exercise => exercise.exerciseId === activity.exerciseId)!.name}`,
    data: [...activity.workoutSets].map((set, index) => ({
      set,
      activity,
      session,
      program
    }))
  }))
  //   ...(Array.from(Array(activity.warmupSets)).map((item, index) => ({
  //     set: {
  //       type: 'Warm-up'
  //     },
  //     activity,
  //     session,
  //     program,
  //     index
  //   })) as SetCardProps[]),
  //   ...(Array.from(Array(activity.workSets)).map((item, index) => ({
  //     set: {
  //       type: 'Work'
  //     },
  //     activity,
  //     session,
  //     program,
  //     index
  //   })) as SetCardProps[])
  // ]
  // }))

  // console.log('sections', sections)

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
        style={tw``}
        sections={sections}
        // sections={[{ title: 'Today', data: [{ name: 'foo' }] }]}
        keyExtractor={(item, index) => `${index}`}
        renderItem={({ index, item, section }) => (
          // <SessionFormLink programId={program.programId}>
          <SetCard
            set={(item as SetCardProps).set}
            activity={(item as SetCardProps).activity}
            session={(item as SetCardProps).session}
            program={(item as SetCardProps).program}
            index={(item as SetCardProps).index}
          />
          // <CardInfo
          //   style={tw.style(
          //     'border-b-2',
          //     index === 0 ? 'rounded-t-xl' : undefined,
          //     index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
          //   )}
          //   specialText="Plan Workout Session"
          //   reverse
          // />
          // </SessionFormLink>
        )}
      />

      {/* <View style={tw`flex flex-col`}>
        {(!sections || sections.length === 0 || sections[0].title.includes('TODAY')) && (
          <SimpleSectionList
            style={tw`pb-9`}
            sections={[{ title: formatDate(new Date()), data: [{ name: 'foo' }] }]}
            keyExtractor={(item, index) => `${index}`}
            renderItem={({ index, section }) => (
              <SessionFormLink programId={program.programId}>
                <CardInfo
                  style={tw.style(
                    'border-b-2',
                    index === 0 ? 'rounded-t-xl' : undefined,
                    index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
                  )}
                  specialText="Plan Workout Session"
                  reverse
                />
              </SessionFormLink>
            )}
          />
        )}
        {sections && sections.length > 0 && (
          <SimpleSectionList
            style={tw`pb-9`}
            sections={sections}
            keyExtractor={session => (session as Session).sessionId}
            renderItem={({ index, item, section }) => (
              <NavigationLink
                style={tw`mb-9`}
                navigationParams={{
                  programId: program.programId,
                  sessionId: (item as Session).sessionId
                }}
                screen="SessionDetailScreen"
              >
                <CardInfo
                  style={tw.style(
                    'border-b-2',
                    index === 0 ? 'rounded-t-xl' : undefined,
                    index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
                  )}
                  primaryText={(item as Session).name}
                  rightIcon={
                    <SecondaryText>
                      <AntDesign name="right" size={16} />
                    </SecondaryText>
                  }
                />
              </NavigationLink>
            )}
          />
        )}
        {program.sessions.length < 1 && (
          <SecondaryText style={tw`pl-4 text-xs`}>
            Start tracking workouts by planning a session.
          </SecondaryText>
        )}
      </View> */}
    </>
  )
}
