import { useEffect, useRef, useState } from "react";
import { SectionList, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import {
  Link,
  Redirect,
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
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
import {
  isSessionTerminalStatus,
  SESSION_INACTIVITY_TIMEOUT_MS,
} from "@activity-log/ui/utils";

import type { WorkoutStore } from "~/hooks/use-workout-store";
import BottomActionBar from "~/components/BottomActionBar";
import { DetailCardRow, NavigationCardRow } from "~/components/CardRow";
import {
  CollapsibleSectionBody,
  CollapsibleSectionHeader,
  useCollapsibleSectionScroll,
} from "~/components/CollapsibleSection";
import ElapsedTime from "~/components/ElapsedTime";
import { HeaderTextAction } from "~/components/HeaderAction";
import { HelperText, ScreenHeading } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

const getActivityWorkoutSets = (activity: Activity): WorkoutSet[] => [
  ...activity.warmupSets,
  ...activity.mainSets,
];

const isWorkoutSetDone = (workoutSet: WorkoutSet) =>
  workoutSet.status === "Done" && (workoutSet.actualReps ?? 0) > 0;

const getCompletedSetTextLines = (workoutSet: WorkoutSet) => {
  const { actualReps, weight } = workoutSet;
  if (!isWorkoutSetDone(workoutSet) || actualReps == null) {
    return undefined;
  }

  return weight?.value
    ? ([`${weight.value} ${weight.unit}`, `${actualReps} reps`] as const)
    : ([`${actualReps} reps`] as const);
};

const sessionCleanupWarningDelayMs = SESSION_INACTIVITY_TIMEOUT_MS / 2;
const completionTextCharacterWidth = 8;

function SessionCleanupWarning({ session }: { session: Session }) {
  const warningAt = session.lastActivityAt
    ? session.lastActivityAt.getTime() + sessionCleanupWarningDelayMs
    : undefined;
  const [currentTime, setCurrentTime] = useState(0);
  const visible =
    session.status === "Ready" && warningAt != null && currentTime >= warningAt;

  useEffect(() => {
    if (session.status !== "Ready" || warningAt == null) return;

    const delay = Math.max(0, warningAt - Date.now());
    const timeout = setTimeout(
      () => setCurrentTime(Math.max(Date.now(), warningAt)),
      delay,
    );
    return () => clearTimeout(timeout);
  }, [session.status, warningAt]);

  return visible ? (
    <HelperText>
      Sessions left open without activity after 1 hour will automatically be
      marked incomplete
    </HelperText>
  ) : null;
}

const areAllActivitySetsDone = (activity: Activity) => {
  const workoutSets = getActivityWorkoutSets(activity);
  return workoutSets.length > 0 && workoutSets.every(isWorkoutSetDone);
};

const getCompletedActivityIds = (activities: Activity[]) =>
  new Set(
    activities
      .filter(areAllActivitySetsDone)
      .map((activity) => activity.activityId),
  );

interface WorkoutSetCardProps {
  workoutSet: WarmupSet | MainSet;
  activity: Activity;
  session: Session;
  program: Program;
  title: string;
  index: number;
  completionTextColumnWidth?: number;
}

interface ExerciseSectionItem {
  activityId: string;
  collapsed: boolean;
  workoutSets: WorkoutSetCardProps[];
}

interface ExerciseSection {
  title: string;
  activityId: string;
  allSetsDone: boolean;
  collapsed: boolean;
  data: ExerciseSectionItem[];
}

function WorkoutSetCard({
  workoutSet,
  activity,
  session,
  program,
  title,
  index,
  completionTextColumnWidth,
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
  const completedSetTextLines = getCompletedSetTextLines(workoutSet);

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
            ? "mb-3"
            : undefined
        }
        centerTextLines={completedSetTextLines}
        centerTextColumnWidth={completionTextColumnWidth}
        trailingText={status === "Planned" ? undefined : status}
        trailingTextClassName={
          status === "Ready"
            ? "text-primary"
            : status === "Incomplete"
              ? "text-warning"
              : "text-muted"
        }
        animateTrailingText
        trailingTextAnimationKey={status}
        accessibilityLabel={`Navigate to ${title}${completedSetTextLines ? `, completed with ${workoutSet.weight?.value} ${workoutSet.weight?.unit} for ${workoutSet.actualReps} reps` : ""}, current status: ${status}`}
      />
    </Link>
  );
}

function ExerciseSectionBody({
  collapsed,
  workoutSets,
}: {
  collapsed: boolean;
  workoutSets: WorkoutSetCardProps[];
}) {
  const completionTextColumnWidth = Math.max(
    0,
    ...workoutSets.flatMap(
      ({ workoutSet }) =>
        getCompletedSetTextLines(workoutSet)?.map(
          (line) => line.length * completionTextCharacterWidth,
        ) ?? [],
    ),
  );

  return (
    <CollapsibleSectionBody collapsed={collapsed}>
      {workoutSets.map((item) => (
        <WorkoutSetCard
          key={item.workoutSet.workoutSetId}
          workoutSet={item.workoutSet}
          activity={item.activity}
          session={item.session}
          program={item.program}
          title={item.title}
          index={item.index}
          completionTextColumnWidth={completionTextColumnWidth || undefined}
        />
      ))}
    </CollapsibleSectionBody>
  );
}

export default function SessionDetailScreen() {
  const { programId, sessionId } = useLocalSearchParams<{
    programId: string;
    sessionId: string;
  }>();
  const { programs, exercises, completeSession } = useWorkoutStore(
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
      completeSession={completeSession}
    />
  );
}

function SessionDetailScreenContent({
  program,
  session,
  exercises,
  completeSession,
}: {
  program: Program;
  session: Session;
  exercises: WorkoutStore["exercises"];
  completeSession: WorkoutStore["completeSession"];
}) {
  const router = useRouter();
  const sectionListRef =
    useRef<SectionList<ExerciseSectionItem, ExerciseSection>>(null);
  const collapsibleSectionScroll = useCollapsibleSectionScroll();
  const [collapsedActivityIds, setCollapsedActivityIds] = useState<Set<string>>(
    () => getCompletedActivityIds(session.activities),
  );
  const autoCollapsedActivityIdsRef = useRef<Set<string>>(
    getCompletedActivityIds(session.activities),
  );

  const toggleActivityCollapsed = (activityId: string) => {
    collapsibleSectionScroll.prepareSectionToggle();
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

  useEffect(() => {
    const completedActivityIds = getCompletedActivityIds(session.activities);
    const autoCollapsedActivityIds = autoCollapsedActivityIdsRef.current;
    const newlyCompletedActivityIds = [...completedActivityIds].filter(
      (activityId) => !autoCollapsedActivityIds.has(activityId),
    );

    autoCollapsedActivityIdsRef.current = new Set(
      [...autoCollapsedActivityIds].filter((activityId) =>
        completedActivityIds.has(activityId),
      ),
    );
    newlyCompletedActivityIds.forEach((activityId) => {
      autoCollapsedActivityIdsRef.current.add(activityId);
    });

    if (!newlyCompletedActivityIds.length) return;

    setCollapsedActivityIds((current) => {
      const next = new Set(current);
      newlyCompletedActivityIds.forEach((activityId) => {
        next.add(activityId);
      });
      return next;
    });
  }, [session.activities]);

  const workoutSetsPending = _.reduce(
    session.activities,
    (result, activity) =>
      _.concat(
        result,
        _.filter(
          getActivityWorkoutSets(activity),
          (workoutSet) => !isWorkoutSetDone(workoutSet),
        ),
      ),
    [] as WorkoutSet[],
  );

  const sections = session.activities.map<ExerciseSection>(
    (activity, actIndex) => {
      const allSetsDone = areAllActivitySetsDone(activity);
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
        title: (() => {
          const exercise = exercises.find(
            (e) => e.exerciseId === activity.exerciseId,
          );

          return exercise
            ? `${exercise.name}${exercise.deleted ? " (Deleted)" : ""}`
            : `Activity ${actIndex + 1}`;
        })(),
        activityId: activity.activityId,
        allSetsDone,
        collapsed,
        data: [{ activityId: activity.activityId, collapsed, workoutSets }],
      };
    },
  );

  const completable =
    session.status === "Incomplete" ||
    (!workoutSetsPending.length &&
      session.status === "Ready" &&
      session.activities.length > 0);

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
          ref={sectionListRef}
          className="flex-1"
          sections={sections}
          onLayout={collapsibleSectionScroll.onListLayout}
          onScroll={collapsibleSectionScroll.onScroll}
          scrollEventThrottle={16}
          contentContainerClassName="pt-36 px-5 pb-24"
          keyExtractor={(item) => item.activityId}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <Animated.View layout={LinearTransition.duration(500)}>
              <DetailCardRow
                label="Session"
                value={session.name}
                cardVariants={["multiline"]}
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
                  <SessionCleanupWarning session={session} />
                </>
              )}
              <ScreenHeading>Planned Exercises</ScreenHeading>
            </Animated.View>
          }
          extraData={collapsedActivityIds}
          renderSectionHeader={({
            section: { activityId, allSetsDone, collapsed, title },
          }) => (
            <CollapsibleSectionHeader
              title={title}
              collapsed={collapsed}
              titleClassName={
                allSetsDone
                  ? "text-muted leading-tight"
                  : "text-foreground leading-tight"
              }
              chevronClassName={
                collapsed && !allSetsDone ? "text-primary" : "text-muted"
              }
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
                  isSessionTerminalStatus(session.status) ||
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
            completeSession(program.programId, {
              ...session,
              status: "Done",
              end: session.status === "Incomplete" ? session.end : new Date(),
            });
            router.dismissTo(`/(public)/(app)/program/${program.programId}`);
          }}
        />
      </View>
    </>
  );
}
