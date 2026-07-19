import type { LayoutChangeEvent } from "react-native";
import { useEffect, useState } from "react";
import { SectionList, Text, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Link, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
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
import PressableThemed from "~/components/PressableThemed";
import {
  HelperText,
  ScreenHeading,
  SectionHeading,
} from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

const collapseAnimationDuration = 320;
const collapseAnimationEasing = Easing.bezier(0.22, 0, 0, 1);

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

function ExerciseSectionHeader({
  title,
  collapsed,
  onPress,
}: {
  title: string;
  collapsed: boolean;
  onPress: () => void;
}) {
  const chevronRotation = useSharedValue(collapsed ? 0 : 90);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  useEffect(() => {
    chevronRotation.value = withTiming(collapsed ? 0 : 90, { duration: 180 });
  }, [chevronRotation, collapsed]);

  return (
    <PressableThemed
      className="mx-5 flex-row items-center justify-between pt-3 pb-2"
      onPress={onPress}
      accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${title}`}
      accessibilityState={{ expanded: !collapsed }}
    >
      <SectionHeading
        placement="inline"
        className="text-foreground flex-1 pr-3"
      >
        {title}
      </SectionHeading>
      <Animated.Text
        maxFontSizeMultiplier={2.5}
        className="text-primary"
        style={chevronStyle}
      >
        <AntDesign name="right" size={15} />
      </Animated.Text>
    </PressableThemed>
  );
}

function ExerciseSectionBody({
  collapsed,
  workoutSets,
}: {
  collapsed: boolean;
  workoutSets: WorkoutSetCardProps[];
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const expansionProgress = useSharedValue(collapsed ? 0 : 1);
  const bodyStyle = useAnimatedStyle(() =>
    contentHeight > 0
      ? { height: contentHeight * expansionProgress.value }
      : {},
  );
  const contentStyle = useAnimatedStyle(() =>
    contentHeight > 0
      ? {
          transform: [
            { translateY: -contentHeight * (1 - expansionProgress.value) },
          ],
        }
      : {},
  );

  useEffect(() => {
    expansionProgress.value = withTiming(collapsed ? 0 : 1, {
      duration: collapseAnimationDuration,
      easing: collapseAnimationEasing,
    });
  }, [collapsed, expansionProgress]);

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && nextHeight !== contentHeight) {
      setContentHeight(nextHeight);
    }
  };

  return (
    <Animated.View className="overflow-hidden" style={bodyStyle}>
      <Animated.View onLayout={handleContentLayout} style={contentStyle}>
        {workoutSets.map((item) => (
          <WorkoutSetCard
            key={item.workoutSet.workoutSetId}
            workoutSet={item.workoutSet}
            activity={item.activity}
            session={item.session}
            program={item.program}
            title={item.title}
            index={item.index}
          />
        ))}
      </Animated.View>
    </Animated.View>
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
  const [collapsedActivityIds, setCollapsedActivityIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleActivityCollapsed = (activityId: string) => {
    setCollapsedActivityIds((current) => {
      const next = new Set(current);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  };

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
    activityId: string;
    collapsed: boolean;
    data: {
      activityId: string;
      collapsed: boolean;
      workoutSets: WorkoutSetCardProps[];
    }[];
  }>((activity, actIndex) => {
    const collapsed = collapsedActivityIds.has(activity.activityId);
    const workoutSets = _.concat<WorkoutSetCardProps>(
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
        index: activity.warmupSets.length + i,
      })),
    );

    return {
      title:
        exercises.find((e) => e.exerciseId === activity.exerciseId)?.name ??
        `Activity ${actIndex + 1}`,
      activityId: activity.activityId,
      collapsed,
      data: [{ activityId: activity.activityId, collapsed, workoutSets }],
    };
  });

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
          contentContainerClassName="pt-36 px-5 pb-24"
          keyExtractor={(item) => item.activityId}
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
          extraData={collapsedActivityIds}
          renderSectionHeader={({
            section: { activityId, collapsed, title },
          }) => (
            <ExerciseSectionHeader
              title={title}
              collapsed={collapsed}
              onPress={() => toggleActivityCollapsed(activityId)}
            />
          )}
          renderItem={({ item }) => (
            <ExerciseSectionBody
              collapsed={item.collapsed}
              workoutSets={item.workoutSets}
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
