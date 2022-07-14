import { AntDesign } from '@expo/vector-icons'
import { format } from 'date-fns'
import React from 'react'
import { SectionList } from 'react-native'
import { tw } from '../tailwind'
import { Activity, Exercise, MainSet, Program, Session, WarmupSet, WorkoutSet } from '../types'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import NavigationLink from './Navigation/NavigationLink'
import { PrimaryText, SecondaryText, SpecialText } from './Typography'

type Props = {
  program: Program
  session: Session
  exercises: Exercise[]
  changeHandler: (programId: string, session: Session) => void
  updateWorkoutSet: (
    programId: string,
    sessionId: string,
    activityId: string,
    workoutSet: WorkoutSet
  ) => void
}

type WorkoutSetCardProps = {
  workoutSet: WarmupSet | MainSet
  activity: Activity
  session: Session
  program: Program
  title: string
  index: number
}

function WorkoutSetCard({
  workoutSet,
  activity,
  session,
  program,
  title,
  index
}: WorkoutSetCardProps) {
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
        specialText={
          workoutSet.status === 'Ready' || (workoutSet.status === 'Planned' && index === 0)
            ? 'Ready'
            : undefined
        }
        secondaryText={workoutSet.status === 'Done' ? workoutSet.status : undefined}
        rightIcon={
          <SecondaryText>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        }
        textStyle={tw`web:text-base web:sm:text-lg`}
        style={tw.style(
          'border-b-2',
          index === 0 ? 'rounded-t-xl' : undefined,
          index === activity.mainSets.length + activity.warmupSets.length - 1
            ? 'rounded-b-xl border-b-0 mb-6'
            : undefined
        )}
      />
    </NavigationLink>
  )
}

export default function SessionDetail({
  program,
  session,
  exercises,
  changeHandler,
  updateWorkoutSet
}: Props) {
  const [elapsedTimeSeconds, setElapsedTimeSeconds] = React.useState(
    // eslint-disable-next-line no-nested-ternary
    session.start
      ? session.end
        ? Math.ceil((session.end.getTime() - session.start.getTime()) / 1000)
        : Math.ceil((new Date().getTime() - session.start.getTime()) / 1000)
      : 0
  )

  React.useEffect(() => {
    const timer = () => {
      setElapsedTimeSeconds(Math.ceil((new Date().getTime() - session.start!.getTime()) / 1000))
    }

    if (session.status === 'Ready' && session.start) {
      const id = setInterval(timer, 1000)
      return () => {
        clearInterval(id)
      }
    }
    return undefined
  }, [elapsedTimeSeconds, session.start, session.status])

  const workoutSetsPending = React.useMemo<WorkoutSet[]>(
    () =>
      session.activities.reduce((total, activity) => {
        total.push(
          ...[...activity.warmupSets, ...activity.mainSets].filter(
            workoutSet => workoutSet.status !== 'Done'
          )
        )
        return total
      }, [] as WorkoutSet[]),
    [session.activities]
  )

  // This process maps the workout set data by activity for the section list.
  const sections: { title: string; data: WorkoutSetCardProps[] }[] = React.useMemo(
    () =>
      Array.from(session.activities, activity => ({
        title: `${exercises.find(exercise => exercise.exerciseId === activity.exerciseId)!.name}`,
        data: [
          ...activity.warmupSets.map((workoutSet, index) => ({
            workoutSet,
            activity,
            session,
            program,
            title: `${workoutSet.type} Set ${index + 1}`,
            index
          })),
          ...activity.mainSets.map((workoutSet, index) => ({
            workoutSet,
            activity,
            session,
            program,
            title: `${workoutSet.type} Set ${index + 1}`,
            index
          }))
        ]
      })),
    [session, exercises, program]
  )

  return (
    <>
      <HeaderRightContainer>
        <NavigationLink
          style={tw`px-4 py-4 -my-4 -mr-4`}
          screen="SessionFormModal"
          navigationParams={{ programId: program.programId, sessionId: session.sessionId }}
        >
          <SpecialText>Edit</SpecialText>
        </NavigationLink>
      </HeaderRightContainer>
      <SectionList
        style={tw`flex-grow px-3 pt-9`}
        sections={sections}
        contentContainerStyle={tw`flex-grow pb-48`}
        keyExtractor={item => `${item.workoutSet.workoutSetId}`}
        ListHeaderComponent={
          <>
            {!workoutSetsPending.length &&
              session.status === 'Ready' &&
              session.activities.length > 0 && (
                <ButtonContainer
                  style={tw`mb-9`}
                  onPress={() => {
                    changeHandler(program.programId, {
                      ...session,
                      status: 'Done',
                      end: new Date()
                    })
                  }}
                >
                  <CardInfo specialText="Complete Workout Session" style={tw`rounded-xl`} reverse />
                </ButtonContainer>
              )}
            <CardInfo
              style={tw.style('rounded-t-xl', !session.start ? 'rounded-b-xl' : 'border-b-2')}
              primaryText="Session"
              secondaryText={session.name}
            />
            {session.start && (
              <>
                <CardInfo
                  style={tw.style(!session.end && !session.start ? 'rounded-b-xl' : 'border-b-2')}
                  primaryText="Start Time"
                  secondaryText={format(session.start, 'MMM do,  hh:mm aa')}
                />
                <CardInfo
                  primaryText="Elapsed Time"
                  secondaryText={`${String(Math.floor(elapsedTimeSeconds / 60)).padStart(
                    2,
                    '0'
                  )}:${String(elapsedTimeSeconds % 60).padStart(2, '0')}`}
                  style={tw`rounded-b-xl`}
                />
              </>
            )}
            <PrimaryText style={tw`font-semibold text-xl mb-2.5 ml-1.5 mt-9`}>
              Workout Sets
            </PrimaryText>
          </>
        }
        renderSectionHeader={({ section: { title } }) => (
          <SecondaryText style={tw`pl-3 pb-1.5 uppercase font-bold text-sm`}>{title}</SecondaryText>
        )}
        renderItem={({ item, index: i }) => (
          <WorkoutSetCard
            workoutSet={item.workoutSet}
            activity={item.activity}
            session={item.session}
            program={item.program}
            title={item.title}
            index={i}
          />
        )}
        ListFooterComponent={
          <SecondaryText style={tw`pl-3 mt-1 text-xs`}>
            {session.activities.length < 1
              ? "Before continuing with this workout session, use the 'Edit' button to add activities."
              : session.activities?.length > 1 ||
                session.status === 'Done' ||
                "Use the 'Edit' button to add more activities to the workout session."}
          </SecondaryText>
        }
        nestedScrollEnabled
      />
    </>
  )
}