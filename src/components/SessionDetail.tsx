import { AntDesign } from '@expo/vector-icons'
import { format } from 'date-fns'
import React from 'react'
import { SectionList } from 'react-native'
import { tw } from '../tailwind'
import { Activity, Exercise, MainSet, Program, Session, WarmupSet, WorkoutSet } from '../types'
import CardInfo from './CardInfo'
import NavigationLink from './Navigation/NavigationLink'
import { SessionFormLink } from './ProgramDetail'
import { SecondaryText } from './Typography'

type Props = {
  program: Program
  session: Session
  exercises: Exercise[]
}

type WorkoutSetCardProps = {
  workoutSet: WarmupSet | MainSet
  activity: Activity
  session: Session
  program: Program
  index: number
  status: 'Ready' | 'Done' | 'Planned'
}

function WorkoutSetCard({
  workoutSet,
  activity,
  session,
  program,
  index,
  status
}: WorkoutSetCardProps) {
  const title = `${workoutSet.type} Set ${index + 1}`
  return (
    <NavigationLink
      screen="WorkoutSetDetailScreen"
      navigationParams={{
        title,
        programId: program.programId,
        sessionId: session.sessionId,
        activityId: activity.activityId,
        workoutSetId: workoutSet.workoutSetId
      }}
    >
      <CardInfo
        primaryText={title}
        specialText={status === 'Ready' ? status : undefined}
        secondaryText={['Planned', 'Done'].includes(status) ? status : undefined}
        rightIcon={
          <SecondaryText>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        }
        textStyle={tw`web:text-base web:sm:text-lg `}
        style={tw.style(
          'border-b-2',
          index === 0 && (workoutSet.type === 'Warm-up' || activity.warmupSets.length === 0)
            ? 'rounded-t-xl'
            : undefined,
          index === activity.warmupSets.length + activity.mainSets.length - 1 &&
            workoutSet.type === 'Main'
            ? 'rounded-b-xl border-b-0 mb-9'
            : undefined
        )}
      />
    </NavigationLink>
  )
}
export default function SessionDetail({ program, session, exercises }: Props) {
  console.log(session)

  const sessionStarted = React.useMemo(
    () =>
      // {
      //   const activities = session.activities.filter(activity => {
      //     const sets = [...activity.warmupSets, ...activity.mainSets].filter(
      //       workoutSet => workoutSet.start
      //     )
      //     console.log(sets)
      //     return !!sets.length
      //   })
      //   console.log(activities)
      //   return !!activities.length
      // },
      !!session.activities.filter(
        activity =>
          !![...activity.warmupSets, ...activity.mainSets].filter(workoutSet => workoutSet.start)
            .length
      ).length,
    [session.activities]
  )

  const deriveStatus = (workoutSet: WorkoutSet, index: number) => {
    if (sessionStarted) {
      if (workoutSet.end) {
        return 'Done'
      }
      if (workoutSet.start) {
        return 'Ready'
      }
      return 'Planned'
    }
    return index === 0 ? 'Ready' : 'Planned'
  }

  // This process maps the workout set data by activity for the section list.
  const sections: { title: string; data: WorkoutSetCardProps[] }[] = Array.from(
    session.activities,
    activity => ({
      title: `${exercises.find(exercise => exercise.exerciseId === activity.exerciseId)!.name}`,
      data: [...activity.warmupSets, ...activity.mainSets].map((workoutSet, index) => ({
        workoutSet,
        activity,
        session,
        program,
        index,
        status: deriveStatus(workoutSet, index)
      }))
    })
  )

  return (
    <>
      <SessionFormLink programId={program.programId} sessionId={session.sessionId}>
        <CardInfo
          style={tw`border-b-2 rounded-t-xl`}
          primaryText={session.name}
          specialText="Edit"
        />
      </SessionFormLink>
      <CardInfo
        style={tw`rounded-b-xl mb-9`}
        primaryText="Start Time"
        secondaryText={sessionStarted ? format(session.start, 'yyyy-MM-dd') : 'Not Started'}
      />

      <SectionList
        style={tw`mb-32`}
        sections={sections}
        keyExtractor={item => `${item.workoutSet.workoutSetId}`}
        renderSectionHeader={({ section: { title } }) => (
          <SecondaryText style={tw`pl-3 pb-1.5 uppercase text-sm`}>{title}</SecondaryText>
        )}
        renderItem={({ item }) => (
          <WorkoutSetCard
            workoutSet={item.workoutSet}
            activity={item.activity}
            session={item.session}
            program={item.program}
            index={item.index}
            status={item.status}
          />
        )}
      />
    </>
  )
}
