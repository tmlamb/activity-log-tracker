import { memo, useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import {
  Link,
  Redirect,
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { format } from "date-fns";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import type {
  SessionActivity,
  SessionDetail,
} from "~/data/repositories/session-detail";
import { useApplicationDataSnapshot } from "~/data/react/application-data";
import {
  useSessionDeloadCandidate,
  useSessionEditorSeed,
} from "~/data/react/session-queries";
import BottomActionBar from "./BottomActionBar";
import Card from "./Card";
import { DetailCardRow, NavigationCardRow } from "./CardRow";
import {
  CollapsibleSection,
  CollapsibleSectionList,
} from "./CollapsibleSection";
import ElapsedTime from "./ElapsedTime";
import { Text } from "./font-scale-text";
import { HeaderTextAction } from "./HeaderAction";
import PressableThemed from "./PressableThemed";
import { SQLiteQueryStatus } from "./sqlite-query-status";
import SwitchThemed from "./SwitchThemed";
import { HelperText, ScreenHeading } from "./Typography";

const completed = (
  set: SessionDetail["activities"][number]["mainSets"][number],
) => set.status === "Done" && (set.actualReps ?? 0) > 0;
const allDone = (activity: SessionActivity) => {
  const sets = [...activity.warmupSets, ...activity.mainSets];
  return sets.length > 0 && sets.every(completed);
};

export function SQLiteSessionDetail({
  runtime,
}: {
  runtime: ApplicationDataRuntime;
}) {
  const { programId, sessionId } = useLocalSearchParams<{
    programId: string;
    sessionId: string;
  }>();
  const snapshot = useApplicationDataSnapshot(runtime);
  const seed = useSessionEditorSeed(runtime, programId, sessionId);
  const session = seed.data?.session;
  const candidate = useSessionDeloadCandidate(
    runtime,
    programId,
    sessionId,
    !!seed.data?.policy?.canSetDeload &&
      session?.status === "Done" &&
      !session.deload,
  );
  if (seed.data === undefined)
    return (
      <SQLiteQueryStatus
        error={seed.isError}
        onRetry={() => void seed.refetch()}
      />
    );
  if (!seed.data?.session || !seed.data.policy)
    return <Redirect href="/(public)/(app)" />;
  return (
    <SessionContent
      key={`${snapshot.generation}:${programId}:${sessionId}`}
      runtime={runtime}
      generation={snapshot.generation}
      session={seed.data.session}
      policy={seed.data.policy}
      candidate={candidate.data}
    />
  );
}

const SessionContent = memo(function SessionContent({
  runtime,
  generation,
  session,
  policy,
  candidate,
}: {
  runtime: ApplicationDataRuntime;
  generation: number;
  session: SessionDetail;
  policy: { canSetDeload: boolean; isLatestCompletedInLineage: boolean };
  candidate: ReturnType<typeof useSessionDeloadCandidate>["data"];
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(
    () => new Set(session.activities.filter(allDone).map(({ id }) => id)),
  );
  const autoCollapsed = useRef(new Set(collapsed));
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const done = new Set(
      session.activities.filter(allDone).map(({ id }) => id),
    );
    const newlyDone = [...done].filter((id) => !autoCollapsed.current.has(id));
    autoCollapsed.current = done;
    if (newlyDone.length)
      setCollapsed((previous) => new Set([...previous, ...newlyDone]));
  }, [session.activities]);
  const current = () =>
    mounted.current && runtime.getSnapshot().generation === generation;
  const changeDeload = (value: boolean) => {
    const commit = async () => {
      if (pendingRef.current || !current()) return;
      pendingRef.current = true;
      setPending(true);
      try {
        await runtime
          .getSnapshot()
          .service.setSessionDeload(session.programId, session.id, value);
      } catch {
        if (current())
          Alert.alert("Save Failed", "The deload setting could not be saved.");
      } finally {
        pendingRef.current = false;
        if (current()) setPending(false);
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
          { text: "Mark as Deload", onPress: () => void commit() },
        ],
      );
    else void commit();
  };
  const finish = async () => {
    if (pendingRef.current || !current()) return;
    pendingRef.current = true;
    setPending(true);
    try {
      const done = await runtime
        .getSnapshot()
        .service.completeSession(session.programId, session.id);
      if (done && current())
        router.dismissTo(
          `/(public)/(app)/program/${encodeURIComponent(session.programId)}`,
        );
      else if (current())
        Alert.alert(
          "Session Changed",
          "The session can no longer be completed.",
        );
    } catch {
      if (current())
        Alert.alert(
          "Complete Failed",
          "The session could not be completed. Please try again.",
        );
    } finally {
      pendingRef.current = false;
      if (current()) setPending(false);
    }
  };
  const setsPending = session.activities
    .flatMap((activity) => [...activity.warmupSets, ...activity.mainSets])
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
          headerRight: () => (
            <Link
              href={`/(public)/(app)/program/${encodeURIComponent(session.programId)}/session/form?sessionId=${encodeURIComponent(session.id)}`}
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
        <CollapsibleSectionList
          className="flex-1"
          data={session.activities}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pt-5 pb-24"
          contentInsetAdjustmentBehavior="automatic"
          extraData={collapsed}
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
                  disabled={pending}
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
          renderItem={({ item, index }) => {
            const sets = [...item.warmupSets, ...item.mainSets];
            const completionWidth = Math.max(
              0,
              ...sets.flatMap((set) =>
                completed(set)
                  ? (set.weightValue
                      ? [
                          `${set.weightValue} ${set.weightUnit}`,
                          `${set.actualReps} reps`,
                        ]
                      : [`${set.actualReps} reps`]
                    ).map((line) => line.length * 8)
                  : [],
              ),
            );
            const name = item.exerciseName
              ? `${item.exerciseName}${item.exerciseDeleted ? " (Deleted)" : ""}`
              : `Activity ${index + 1}`;
            return (
              <CollapsibleSection
                title={name}
                collapsed={collapsed.has(item.id)}
                titleClassName={
                  allDone(item)
                    ? "text-muted leading-tight"
                    : "text-foreground leading-tight"
                }
                chevronClassName={
                  collapsed.has(item.id) && !allDone(item)
                    ? "text-primary"
                    : "text-muted"
                }
                onCollapsedChange={(value) =>
                  setCollapsed((previous) => {
                    const next = new Set(previous);
                    if (value) next.add(item.id);
                    else next.delete(item.id);
                    return next;
                  })
                }
              >
                {sets.map((set, setIndex) => {
                  const title =
                    set.kind === "Warmup"
                      ? `Warmup Set ${item.warmupSets.findIndex((entry) => entry.id === set.id) + 1}`
                      : `Main Set ${item.mainSets.findIndex((entry) => entry.id === set.id) + 1}`;
                  const status =
                    set.status === "Planned" && setIndex === 0
                      ? "Ready"
                      : set.status;
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
                      key={set.id}
                      href={`/(public)/(app)/program/${encodeURIComponent(session.programId)}/session/${encodeURIComponent(session.id)}/set?workoutSetId=${encodeURIComponent(set.id)}&activityId=${encodeURIComponent(item.id)}&title=${encodeURIComponent(title)}`}
                      asChild
                    >
                      <NavigationCardRow
                        title={title}
                        cardVariants={["multiline"]}
                        titleClassName="py-3"
                        stack={{ index: setIndex, size: sets.length }}
                        cardClassName={
                          setIndex === sets.length - 1 ? "mb-3" : undefined
                        }
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
                        accessibilityLabel={`Navigate to ${title}${lines ? `, completed with ${set.weightValue} ${set.weightUnit} for ${set.actualReps} reps` : ""}, current status: ${status}`}
                      />
                    </Link>
                  );
                })}
              </CollapsibleSection>
            );
          }}
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
          hidden={!completable || pending}
          onPress={() => void finish()}
        />
      </View>
    </>
  );
});

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
