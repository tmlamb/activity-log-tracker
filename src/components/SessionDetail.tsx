import { AntDesign } from '@expo/vector-icons'
import { format } from 'date-fns'
import _ from 'lodash'
import React from 'react'
import { SectionList } from 'react-native'
import Animated, { Layout } from 'react-native-reanimated'
import tw from '../tailwind'
import { Activity, Exercise, MainSet, Program, Session, WarmupSet, WorkoutSet } from '../types'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import ElapsedTime from './ElapsedTime'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText } from './Typography'

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
    <LinkButton
      to={{
        screen: 'WorkoutSetDetailScreen',
        params: {
          title,
          programId: program.programId,
          sessionId: session.sessionId,
          activityId: activity.activityId,
          workoutSetId: workoutSet.workoutSetId
        }
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
    </LinkButton>
  )
}

type Props = {
  program: Program
  session: Session
  exercises: Exercise[]
  changeHandler: (programId: string, session: Session) => void
}

export default function SessionDetail({ program, session, exercises, changeHandler }: Props) {
  const workoutSetsPending = _.reduce(
    session.activities,
    (result, activity) =>
      _.concat(
        result,
        _.filter(
          _.concat(activity.warmupSets as WorkoutSet[], activity.mainSets as WorkoutSet[]),
          workoutSet => workoutSet.status !== 'Done'
        )
      ),
    [] as WorkoutSet[]
  )

  // Map the Warmup/Main workout set data by activity for the section list.
  const sections = _(session.activities)
    .map<{ title: string; data: WorkoutSetCardProps[] }>((activity, index) => ({
      title:
        _.find(exercises, { exerciseId: activity.exerciseId })?.name || `Activity ${index + 1}`,
      data: _.concat<WorkoutSetCardProps>(
        _.map(activity.warmupSets, (workoutSet, i) => ({
          workoutSet,
          activity,
          session,
          program,
          title: `Warmup Set ${i + 1}`,
          index: i
        })),
        _.map(activity.mainSets, (workoutSet, i) => ({
          workoutSet,
          activity,
          session,
          program,
          title: `Main Set ${i + 1}`,
          index: i
        }))
      )
    }))
    .value()

  return (
    <>
      <HeaderRightContainer>
        <LinkButton
          style={tw`py-2`}
          to={{
            screen: 'SessionFormModal',
            params: { programId: program.programId, sessionId: session.sessionId }
          }}
        >
          <SpecialText>Edit</SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      {!workoutSetsPending.length && session.status === 'Ready' && session.activities.length > 0 && (
        <ButtonContainer
          style={tw`px-3 pt-9`}
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
      <Animated.View layout={Layout.duration(500)}>
        <SectionList
          style={tw`flex-grow px-3 pt-9`}
          sections={sections}
          contentContainerStyle={tw`flex-grow pb-48`}
          keyExtractor={item => `${item.workoutSet.workoutSetId}`}
          ListHeaderComponent={
            <Animated.View layout={Layout.duration(500)}>
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
                  <ElapsedTime
                    start={session.start}
                    end={session.end}
                    status={session.status}
                    showHours
                  />
                </>
              )}
              <PrimaryText style={tw`font-semibold text-xl mb-2.5 ml-1.5 mt-9`}>
                Planned Activities
              </PrimaryText>
            </Animated.View>
          }
          renderSectionHeader={({ section: { title } }) => (
            <SecondaryText style={tw`pl-3 pb-1.5 uppercase font-bold text-sm`}>
              {title}
            </SecondaryText>
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
      </Animated.View>
    </>
  )
}
