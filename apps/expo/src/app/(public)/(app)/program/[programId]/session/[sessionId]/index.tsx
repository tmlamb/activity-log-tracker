import { SectionList, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { Link, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import _ from "lodash";

import type {
  Activity,
  MainSet,
  Program,
  Session,
  WarmupSet,
  WorkoutSet,
} from "@activity-log/ui/utils";

import type { WorkoutStore } from "~/hooks/use-workout-store";
import BottomActionBar from "~/components/BottomActionBar";
import { DetailCardRow, NavigationCardRow } from "~/components/CardRow";
import ElapsedTime from "~/components/ElapsedTime";
import { HeaderTextAction } from "~/components/HeaderAction";
import {
  HelperText,
  ScreenHeading,
  SectionHeading,
} from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

interface WorkoutSetCardProps {
  workoutSet: WarmupSet | MainSet;
  activity: Activity;
  session: Session;
  program: Program;
  title: string;
  index: number;
}

function WorkoutSetCard({
  workoutSet,
  activity,
  session,
  program,
  title,
  index,
}: WorkoutSetCardProps) {
  const status =
    workoutSet.status === "Planned" &&
    (index === 0 ||
      _.concat(
        activity.warmupSets as WorkoutSet[],
        activity.mainSets as WorkoutSet[],
      ).find((ws) => ws.status === "Done")?.workoutSetId ===
        workoutSet.workoutSetId)
      ? "Ready"
      : workoutSet.status;

  return (
    <Link
      href={`/(public)/(app)/program/${program.programId}/session/${session.sessionId}/set?workoutSetId=${workoutSet.workoutSetId}&activityId=${activity.activityId}&title=${encodeURIComponent(title)}`}
      asChild
    >
      <NavigationCardRow
        title={title}
        stack={{
          index,
          size: activity.mainSets.length + activity.warmupSets.length,
        }}
        cardClassName={
          index === activity.mainSets.length + activity.warmupSets.length - 1
            ? "mb-6"
            : undefined
        }
        trailingText={
          status === "Ready" || status === "Done" ? status : undefined
        }
        trailingTextClassName={
          status === "Ready" ? "text-primary" : "text-muted"
        }
        accessibilityLabel={`Navigate to ${title}, current status: ${status}`}
      />
    </Link>
  );
}

export default function SessionDetailScreen() {
  const { programId, sessionId } = useLocalSearchParams<{
    programId: string;
    sessionId: string;
  }>();
  const { programs, exercises, updateSession } = useWorkoutStore(
    (store) => store,
  );
  const program = programs.find((p) => p.programId === programId);
  const session = program?.sessions.find((s) => s.sessionId === sessionId);

  if (!program || !session) {
    return <Redirect href="/(public)/(app)" />;
  }

  return (
    <SessionDetailScreenContent
      program={program}
      session={session}
      exercises={exercises}
      updateSession={updateSession}
    />
  );
}

function SessionDetailScreenContent({
  program,
  session,
  exercises,
  updateSession,
}: {
  program: Program;
  session: Session;
  exercises: WorkoutStore["exercises"];
  updateSession: WorkoutStore["updateSession"];
}) {
  const workoutSetsPending = _.reduce(
    session.activities,
    (result, activity) =>
      _.concat(
        result,
        _.filter(
          _.concat(
            activity.warmupSets as WorkoutSet[],
            activity.mainSets as WorkoutSet[],
          ),
          (ws) => ws.status !== "Done",
        ),
      ),
    [] as WorkoutSet[],
  );

  const sections = session.activities.map<{
    title: string;
    data: WorkoutSetCardProps[];
  }>((activity, actIndex) => ({
    title:
      exercises.find((e) => e.exerciseId === activity.exerciseId)?.name ??
      `Activity ${actIndex + 1}`,
    data: _.concat<WorkoutSetCardProps>(
      activity.warmupSets.map((ws, i) => ({
        workoutSet: ws,
        activity,
        session,
        program,
        title: `Warmup Set ${i + 1}`,
        index: i,
      })),
      activity.mainSets.map((ws, i) => ({
        workoutSet: ws,
        activity,
        session,
        program,
        title: `Main Set ${i + 1}`,
        index: i,
      })),
    ),
  }));

  const completable =
    !workoutSetsPending.length &&
    session.status === "Ready" &&
    session.activities.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link
              href={`/(public)/(app)/program/${program.programId}/session/form?sessionId=${session.sessionId}`}
              asChild
            >
              <HeaderTextAction
                label="Edit"
                accessibilityLabel="Edit workout session"
              />
            </Link>
          ),
        }}
      />
      <View className="flex-1">
        <SectionList
          className="flex-1"
          sections={sections}
          contentContainerClassName="pt-36 px-5 pb-18"
          keyExtractor={(item) => `${item.workoutSet.workoutSetId}`}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <Animated.View layout={LinearTransition.duration(500)}>
              <DetailCardRow
                label="Session"
                value={session.name}
                valueNumberOfLines={1}
                stack={session.start ? { index: 0, size: 3 } : undefined}
              />
              {session.start && (
                <>
                  <DetailCardRow
                    label="Start Time"
                    value={format(session.start, "MMM do,  hh:mm aa")}
                    stack={{ index: 1, size: 3 }}
                  />
                  <ElapsedTime
                    start={session.start}
                    end={session.end}
                    status={session.status}
                    stack={{ index: 2, size: 3 }}
                    showHours
                  />
                </>
              )}
              <ScreenHeading>Planned Exercises</ScreenHeading>
            </Animated.View>
          }
          renderSectionHeader={({ section: { title } }) => (
            <SectionHeading placement="inset">{title}</SectionHeading>
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
            <HelperText>
              {session.activities.length < 1
                ? "Before continuing with this workout session, use the 'Edit' button to add exercises."
                : session.activities.length > 1 ||
                  session.status === "Done" ||
                  "Use the 'Edit' button to add more exercises to the workout session."}
            </HelperText>
          }
          nestedScrollEnabled
        />
        <BottomActionBar
          label="Complete Workout Session"
          accessibilityLabel="Complete workout session"
          className="absolute bottom-0 z-10 w-full"
          visible={completable}
          onPress={() => {
            updateSession(program.programId, {
              ...session,
              status: "Done",
              end: new Date(),
            });
          }}
        />
      </View>
    </>
  );
}
