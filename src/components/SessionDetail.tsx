import { AntDesign } from '@expo/vector-icons'
import { format } from 'date-fns'
import _ from 'lodash'
import React from 'react'
import { Platform, SectionList, View } from 'react-native'
import Animated, { Layout } from 'react-native-reanimated'
import tw from '../tailwind'
import { Activity, Exercise, MainSet, Program, Session, WarmupSet, WorkoutSet } from '../types'
import ButtonContainer from './ButtonContainer'
import ElapsedTime from './ElapsedTime'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

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
  const status =
    workoutSet.status === 'Planned' &&
    (index === 0 ||
      _.find(
        _.concat(activity.warmupSets as WorkoutSet[], activity.mainSets as WorkoutSet[]),
        ws => ws.status === 'Done'
      )?.workoutSetId === workoutSet.workoutSetId)
      ? 'Ready'
      : workoutSet.status
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
      accessibilityLabel={`Navigate to ${title}, current status: ${status}`}
    >
      <ThemedView
        style={tw.style(
          'border-b-2',
          index === 0 ? 'rounded-t-xl' : undefined,
          index === activity.mainSets.length + activity.warmupSets.length - 1
            ? 'rounded-b-xl border-b-0 mb-6'
            : undefined
        )}
      >
        <PrimaryText>{title}</PrimaryText>
        <View style={tw`flex-row pr-4`}>
          <SpecialText>{status === 'Ready' ? status : undefined}</SpecialText>
          <SecondaryText>{status === 'Done' ? status : undefined}</SecondaryText>
          <SecondaryText style={tw`absolute self-center -right-1`}>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        </View>
      </ThemedView>
    </LinkButton>
  )
}

type Props = {
  program: Program
  session: Session
  exercises: Exercise[]
  changeHandler: (programId: string, session: Session) => void
  goBack: () => void
}

export default function SessionDetail({
  program,
  session,
  exercises,
  changeHandler,
  goBack
}: Props) {
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

  const completable =
    !workoutSetsPending.length && session.status === 'Ready' && session.activities.length > 0

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
      {Platform.OS === 'web' && (
        <HeaderLeftContainer>
          <ButtonContainer onPress={goBack}>
            <SpecialText>Back</SpecialText>
          </ButtonContainer>
        </HeaderLeftContainer>
      )}
      {completable && (
        <ButtonContainer
          style={tw`px-3 pt-9 pb-[18px]`}
          onPress={() => {
            changeHandler(program.programId, {
              ...session,
              status: 'Done',
              end: new Date()
            })
          }}
        >
          <ThemedView style={tw`rounded-xl`}>
            <SpecialText>Complete Workout Session</SpecialText>
          </ThemedView>
        </ButtonContainer>
      )}
      <Animated.View style={tw`flex-1`} layout={Layout.duration(500)}>
        <SectionList
          style={tw`flex-1`}
          sections={sections}
          contentContainerStyle={tw.style(
            'px-3 flex-grow',
            completable ? 'pt-[18px] pb-36' : 'pt-9 pb-12'
          )}
          keyExtractor={item => `${item.workoutSet.workoutSetId}`}
          ListHeaderComponent={
            <Animated.View layout={Layout.duration(500)}>
              <ThemedView
                style={tw.style('rounded-t-xl', !session.start ? 'rounded-b-xl' : 'border-b-2')}
              >
                <PrimaryText style={tw`pr-3`}>Session</PrimaryText>
                <SecondaryText style={tw`flex-1 text-right`} numberOfLines={1}>
                  {session.name}
                </SecondaryText>
              </ThemedView>
              {session.start && (
                <>
                  <ThemedView
                    style={tw.style(!session.end && !session.start ? 'rounded-b-xl' : 'border-b-2')}
                  >
                    <PrimaryText>Start Time</PrimaryText>
                    <SecondaryText>{format(session.start, 'MMM do,  hh:mm aa')}</SecondaryText>
                  </ThemedView>
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
            <SecondaryText style={tw`ml-3 mb-1.5 uppercase font-bold text-sm`}>
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
            <SecondaryText style={tw`ml-3 mt-1 text-xs`}>
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
