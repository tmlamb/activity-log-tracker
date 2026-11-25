import { memo, useEffect, useState } from "react";
import { Alert, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { format } from "date-fns";

import type {
  SessionActivity,
  SessionDetail,
} from "~/data/repositories/session-detail";
import BottomActionBar from "~/components/BottomActionBar";
import Card from "~/components/Card";
import { DetailCardRow, NavigationCardRow } from "~/components/CardRow";
import {
  CollapsibleSection,
  CollapsibleSectionList,
} from "~/components/CollapsibleSection";
import ElapsedTime from "~/components/ElapsedTime";
import { Text } from "~/components/font-scale-text";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import MissingDataRedirect from "~/components/MissingDataRedirect";
import PressableThemed from "~/components/PressableThemed";
import SwitchThemed from "~/components/SwitchThemed";
import { HelperText, ScreenHeading } from "~/components/Typography";
import { completeSession, setSessionDeload } from "~/data/actions";
import {
  useSessionDeloadCandidate,
  useSessionEditorSeed,
} from "~/data/queries";
import {
  supersetRows,
  supersetSetOrder,
} from "~/data/repositories/session-detail";
import useRouter from "~/hooks/use-router";

const completed = (
  set: SessionDetail["activities"][number]["mainSets"][number],
) => set.status === "Done" && (set.actualReps ?? 0) > 0;
const allDone = (activity: SessionActivity) => {
  const sets = supersetRows(activity).flatMap((row) => [
    ...row.warmupSets,
    ...row.mainSets,
    ...row.dropSets,
  ]);
  return sets.length > 0 && sets.every(completed);
};

export default function SessionDetailScreen() {
  const { programId, sessionId } = useLocalSearchParams<{
    programId: string;
    sessionId: string;
  }>();
  const seed = useSessionEditorSeed(programId, sessionId);
  const session = seed?.session;
  const candidate = useSessionDeloadCandidate(
    programId,
    sessionId,
    !!seed?.policy?.canSetDeload &&
      session?.status === "Done" &&
      !session.deload,
  );
  if (!seed?.session || !seed.policy) return <MissingDataRedirect />;
  return (
    <SessionContent
      key={`${programId}:${sessionId}`}
      session={seed.session}
      policy={seed.policy}
      candidate={candidate}
    />
  );
}

const SessionContent = memo(function SessionContent({
  session,
  policy,
  candidate,
}: {
  session: SessionDetail;
  policy: { canSetDeload: boolean; isLatestCompletedInLineage: boolean };
  candidate: ReturnType<typeof useSessionDeloadCandidate>;
}) {
  const router = useRouter();
  const headerButton = useHeaderButtonProps();
  const changeDeload = (value: boolean) => {
    const commit = () => {
      try {
        setSessionDeload(session.programId, session.id, value);
      } catch {
        Alert.alert("Save Failed", "The deload setting could not be saved.");
      }
    };
    if (
      value &&
      session.status !== "Incomplete" &&
      (session.status !== "Done" || policy.isLatestCompletedInLineage)
    )
      Alert.alert(
        "Mark as Deload Session?",
        "This session will be ignored when planning the next session from this template. The last completed non-deload session will be used instead.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark as Deload", onPress: commit },
        ],
      );
    else commit();
  };
  const finish = () => {
    // A second tap would find the session already complete.
    if (router.isNavigating()) return;
    let done: boolean;
    try {
      done = completeSession(session.programId, session.id);
    } catch {
      Alert.alert(
        "Complete Failed",
        "The session could not be completed. Please try again.",
      );
      return;
    }
    if (done)
      router.dismissTo(
        `/(public)/(app)/program/${encodeURIComponent(session.programId)}`,
      );
    else
      Alert.alert("Session Changed", "The session can no longer be completed.");
  };
  const setsPending = session.activities
    .flatMap(supersetRows)
    .flatMap((activity) => [
      ...activity.warmupSets,
      ...activity.mainSets,
      ...activity.dropSets,
    ])
    .some((set) => !completed(set));
  const completable =
    session.status === "Incomplete" ||
    (session.status === "Ready" &&
      session.activities.length > 0 &&
      !setsPending);
  const showDeload =
    policy.canSetDeload && (session.deload || candidate?.candidate === true);
  const summarySize =
    1 + (session.startMs !== null ? 2 : 0) + Number(showDeload);
  return (
    <>
      <Stack.Screen
        options={{
          title: session.deload ? "Deload Session" : "Workout Session",
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          {...headerButton()}
          accessibilityLabel="Edit workout session"
          onPress={() =>
            router.push(
              `/(public)/(app)/program/${encodeURIComponent(session.programId)}/session/form?sessionId=${encodeURIComponent(session.id)}`,
            )
          }
        >
          Edit
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <View className="flex-1">
        <CollapsibleSectionList
          className="flex-1"
          data={session.activities}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pt-5 pb-24"
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={
            <Animated.View layout={LinearTransition.duration(500)}>
              <DetailCardRow
                label="Session"
                value={session.name}
                cardVariants={["multiline"]}
                stack={
                  summarySize > 1 ? { index: 0, size: summarySize } : undefined
                }
              />
              {session.startMs !== null && (
                <>
                  <DetailCardRow
                    label="Start Time"
                    value={format(
                      new Date(session.startMs),
                      "MMM do,  hh:mm aa",
                    )}
                    valueMaxFontSizeMultiplier={1.25}
                    stack={{ index: 1, size: summarySize }}
                  />
                  <ElapsedTime
                    start={new Date(session.startMs)}
                    end={
                      session.endMs === null
                        ? undefined
                        : new Date(session.endMs)
                    }
                    status={session.status}
                    stack={{ index: 2, size: summarySize }}
                    showHours
                  />
                </>
              )}
              {showDeload && (
                <PressableThemed
                  accessibilityRole="switch"
                  accessibilityLabel="Deload session"
                  accessibilityHint="Marks this workout as a deload session"
                  accessibilityState={{ checked: session.deload }}
                  onPress={() => changeDeload(!session.deload)}
                >
                  <Card
                    stack={{
                      index: session.startMs !== null ? 3 : 1,
                      size: summarySize,
                    }}
                  >
                    <Text
                      accessible={false}
                      maxFontSizeMultiplier={2}
                      className="text-muted text-xl tracking-tight"
                    >
                      Deload
                    </Text>
                    <View
                      accessible={false}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      pointerEvents="none"
                    >
                      <SwitchThemed
                        value={session.deload}
                        onValueChange={changeDeload}
                        testID="session-deload-toggle"
                      />
                    </View>
                  </Card>
                </PressableThemed>
              )}
              {candidate?.partial && (
                <HelperText>
                  Deload detection is unavailable because some workout details
                  are missing.
                </HelperText>
              )}
              <SessionCleanupWarning
                status={session.status}
                lastActivityAtMs={session.lastActivityAtMs}
              />
              <ScreenHeading>Planned Exercises</ScreenHeading>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <ActivityRow
              activity={item}
              index={index}
              programId={session.programId}
              sessionId={session.id}
            />
          )}
          ListFooterComponent={
            <HelperText>
              {session.activities.length < 1
                ? "Before continuing with this workout session, use the 'Edit' button to add exercises."
                : session.activities.length > 1 ||
                    session.status === "Done" ||
                    session.status === "Incomplete"
                  ? ""
                  : "Use the 'Edit' button to add more exercises to the workout session."}
            </HelperText>
          }
          nestedScrollEnabled
        />
        <BottomActionBar
          label="Complete Workout Session"
          accessibilityLabel="Complete workout session"
          hidden={!completable}
          onPress={finish}
        />
      </View>
    </>
  );
});

/**
 * One exercise's sets, or a superset's sets alternating between its exercises.
 * Collapse state lives here, not in the screen: list rows re-render reliably
 * for their own state, as on the program screen's weeks.
 */
function ActivityRow({
  activity: item,
  index,
  programId,
  sessionId,
}: {
  activity: SessionActivity;
  index: number;
  programId: string;
  sessionId: string;
}) {
  const done = allDone(item);
  // Every exercise starts collapsed, whatever its progress.
  const [collapsed, setCollapsed] = useState(true);
  // Collapse an exercise automatically when its last set is completed.
  const [wasDone, setWasDone] = useState(done);
  if (done !== wasDone) {
    setWasDone(done);
    if (done) setCollapsed(true);
  }
  const rows = supersetRows(item);
  const superset = rows.length > 1;
  const ordered = supersetSetOrder(rows);
  const sets = ordered.map(({ set }) => set);
  // Started with sets still to do. A finished session has no pending sets.
  const inProgress =
    sets.some((set) => set.status !== "Planned") &&
    sets.some((set) => set.status === "Planned" || set.status === "Ready");
  const completionWidth = Math.max(
    0,
    ...sets.flatMap((set) =>
      completed(set)
        ? (set.weightValue
            ? [`${set.weightValue} ${set.weightUnit}`, `${set.actualReps} reps`]
            : [`${set.actualReps} reps`]
          ).map((line) => line.length * 8)
        : [],
    ),
  );
  const exerciseName = (row: SessionActivity["supersets"][number]) =>
    row.exerciseName
      ? `${row.exerciseName}${row.exerciseDeleted ? " (Deleted)" : ""}`
      : "Unavailable exercise";
  // A superset lists its exercises separated by a muted " ⇄ "; the joined
  // name is its accessibility name.
  const name = superset
    ? rows.map(exerciseName).join(", ")
    : item.exerciseName
      ? exerciseName(item)
      : `Activity ${index + 1}`;
  return (
    <CollapsibleSection
      title={name}
      titleParts={superset ? rows.map(exerciseName) : undefined}
      collapsed={collapsed}
      titleClassName={done ? "text-muted" : "text-foreground"}
      chevronClassName={
        inProgress ? "text-primary" : done ? "text-muted" : "text-foreground"
      }
      onCollapsedChange={setCollapsed}
    >
      {ordered.map(({ row, set, kind, index: number }, setIndex) => {
        const title =
          kind === "Warmup"
            ? `Warmup Set ${number + 1}`
            : kind === "Drop"
              ? `Drop Set ${number + 1}`
              : `${superset ? "Superset" : "Main Set"} ${number + 1}`;
        const status =
          set.status === "Planned" && setIndex === 0 ? "Ready" : set.status;
        const lines = completed(set)
          ? set.weightValue
            ? ([
                `${set.weightValue} ${set.weightUnit}`,
                `${set.actualReps} reps`,
              ] as const)
            : ([`${set.actualReps} reps`] as const)
          : undefined;
        return (
          <Link
            key={`${row.id}:${set.id}`}
            href={`/(public)/(app)/program/${encodeURIComponent(programId)}/session/${encodeURIComponent(sessionId)}/set?workoutSetId=${encodeURIComponent(set.id)}&activityId=${encodeURIComponent(row.id)}&title=${encodeURIComponent(title)}`}
            asChild
          >
            <NavigationCardRow
              title={title}
              // In a superset, each set names its exercise on its own lines.
              subtitle={superset ? exerciseName(row) : undefined}
              cardVariants={["multiline"]}
              titleClassName={superset ? undefined : "py-3"}
              stack={{ index: setIndex, size: sets.length }}
              cardClassName={setIndex === sets.length - 1 ? "mb-3" : undefined}
              centerTextLines={lines}
              centerTextColumnWidth={completionWidth || undefined}
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
              accessibilityLabel={`Navigate to ${title}${superset ? ` of ${exerciseName(row)}` : ""}${lines ? `, completed with ${set.weightValue} ${set.weightUnit} for ${set.actualReps} reps` : ""}, current status: ${status}`}
            />
          </Link>
        );
      })}
    </CollapsibleSection>
  );
}

function SessionCleanupWarning({
  status,
  lastActivityAtMs,
}: {
  status: SessionDetail["status"];
  lastActivityAtMs: number | null;
}) {
  const focused = useIsFocused();
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!focused || status !== "Ready" || lastActivityAtMs === null) return;
    const warningAt = lastActivityAtMs + 30 * 60 * 1000;
    const timeout = setTimeout(
      () => setClock(Date.now()),
      Math.max(0, warningAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [focused, status, lastActivityAtMs]);
  if (
    status !== "Ready" ||
    lastActivityAtMs === null ||
    clock < lastActivityAtMs + 30 * 60 * 1000
  )
    return null;
  return (
    <HelperText>
      Sessions left open without activity after 1 hour will automatically be
      marked incomplete
    </HelperText>
  );
}
