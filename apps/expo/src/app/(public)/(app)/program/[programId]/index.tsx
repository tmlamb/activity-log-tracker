import { useEffect, useRef, useState } from "react";
import { SectionList, Text, View } from "react-native";
import { Link, Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import _ from "lodash";

import type { Session } from "@activity-log/ui/utils";
import { weekAndDayNumbersFromStart } from "@activity-log/ui/utils";

import type { WorkoutStore } from "~/hooks/use-workout-store";
import BottomActionBar from "~/components/BottomActionBar";
import { DetailCardRow, NavigationCardRow } from "~/components/CardRow";
import {
  CollapsibleSectionBody,
  CollapsibleSectionHeader,
} from "~/components/CollapsibleSection";
import PressableThemed from "~/components/PressableThemed";
import { HelperText, ScreenHeading } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

const sessionStatusOrder: Record<Session["status"], number> = {
  Ready: 0,
  Planned: 1,
  Done: 2,
  Incomplete: 2,
};

interface WeekSectionItem {
  week: number;
  collapsed: boolean;
  session?: Session;
}

interface WeekSection {
  title: string;
  week: number;
  collapsed: boolean;
  sessionCount: number;
  data: WeekSectionItem[];
}

export default function ProgramDetailScreen() {
  const { programId, focusSessionId } = useLocalSearchParams<{
    programId: string;
    focusSessionId?: string;
  }>();
  const programs = useWorkoutStore((state) => state.programs);
  const program = programs.find((p) => p.programId === programId);

  if (!program) {
    return <Redirect href="/(public)/(app)" />;
  }

  return (
    <ProgramDetailScreenContent
      program={program}
      focusSessionId={focusSessionId}
    />
  );
}

function ProgramDetailScreenContent({
  program,
  focusSessionId,
}: {
  program: WorkoutStore["programs"][number];
  focusSessionId?: string;
}) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const sectionListRef =
    useRef<SectionList<WeekSectionItem, WeekSection>>(null);
  const [weekCollapseOverrides, setWeekCollapseOverrides] = useState<
    Set<number>
  >(() => new Set());
  const now = new Date();
  const orderedByStart = _.orderBy(program.sessions, ["start"], ["asc"]);
  const programStart = orderedByStart[0]?.start ?? now;

  const getSessionWeekAndDay = (session: Session) =>
    weekAndDayNumbersFromStart(
      programStart,
      session.start ?? now,
      session.weekOffset,
    );

  const weekSections: {
    title: string;
    week: number;
    sessions: Session[];
  }[] = _(orderedByStart)
    .groupBy((session) => getSessionWeekAndDay(session).week)
    .map((data, week) => ({
      title: `Week ${week}`,
      week: Number(week),
      sessions: _.sortBy(
        [...data].reverse(),
        (session) => sessionStatusOrder[session.status],
      ),
    }))
    .value();

  const { week: currentWeek } = weekAndDayNumbersFromStart(programStart, now);
  const currentWeekSection = weekSections.find(
    (section) => section.week === currentWeek,
  );

  if (!currentWeekSection) {
    weekSections.push({
      title: `Week ${currentWeek}`,
      week: currentWeek,
      sessions: [],
    });
  }

  weekSections.sort((a, b) => b.week - a.week);

  const currentWeekSectionIndex = weekSections.findIndex(
    (section) => section.week === currentWeek,
  );

  const toggleWeekCollapsed = (week: number) => {
    setWeekCollapseOverrides((current) => {
      const next = new Set(current);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  };

  const sections: WeekSection[] = weekSections.map(
    ({ title, week, sessions }, index) => {
      const collapsedByDefault = index > currentWeekSectionIndex;
      const collapsedFromState = weekCollapseOverrides.has(week)
        ? !collapsedByDefault
        : collapsedByDefault;
      const containsFocusedSession = sessions.some(
        (session) => session.sessionId === focusSessionId,
      );
      const collapsed = containsFocusedSession ? false : collapsedFromState;
      const isCurrent = week === currentWeek;
      const data: WeekSectionItem[] = sessions.length
        ? sessions.map((session) => ({ week, collapsed, session }))
        : [{ week, collapsed }];

      return {
        title: `${title}${isCurrent ? " (Current)" : ""}`,
        week,
        collapsed,
        sessionCount: sessions.length,
        data,
      };
    },
  );

  const focusedSectionIndex = focusSessionId
    ? sections.findIndex((section) =>
        section.data.some((item) => item.session?.sessionId === focusSessionId),
      )
    : -1;
  const focusedSection = sections[focusedSectionIndex];
  const focusedItemIndex = focusSessionId
    ? (focusedSection?.data.findIndex(
        (item) => item.session?.sessionId === focusSessionId,
      ) ?? -1)
    : -1;
  const focusedWeek = focusedSection?.week;

  useEffect(() => {
    if (!isFocused || !focusSessionId) {
      return;
    }

    if (
      focusedSectionIndex < 0 ||
      focusedItemIndex < 0 ||
      focusedWeek == null
    ) {
      const clearFocusTimeout = setTimeout(
        () => router.setParams({ focusSessionId: undefined }),
        0,
      );
      return () => clearTimeout(clearFocusTimeout);
    }

    const scrollTimeout = setTimeout(() => {
      const collapsedByDefault = focusedSectionIndex > currentWeekSectionIndex;
      setWeekCollapseOverrides((current) => {
        const hasOverride = current.has(focusedWeek);
        if (hasOverride === collapsedByDefault) return current;

        const next = new Set(current);
        if (collapsedByDefault) {
          next.add(focusedWeek);
        } else {
          next.delete(focusedWeek);
        }
        return next;
      });
      sectionListRef.current?.recordInteraction();
      sectionListRef.current?.scrollToLocation({
        animated: true,
        sectionIndex: focusedSectionIndex,
        // RN 0.86 omits the current section header from its flattened index.
        itemIndex: focusedItemIndex + 1,
        viewPosition: 0.45,
      });
    }, 400);
    const clearFocusTimeout = setTimeout(
      () => router.setParams({ focusSessionId: undefined }),
      2000,
    );

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(clearFocusTimeout);
    };
  }, [
    currentWeekSectionIndex,
    focusSessionId,
    focusedItemIndex,
    focusedSectionIndex,
    focusedWeek,
    isFocused,
    router,
  ]);

  return (
    <View className="flex-1">
      <SectionList
        ref={sectionListRef}
        contentContainerClassName="px-5 pt-36 pb-36"
        sections={sections}
        extraData={weekCollapseOverrides}
        keyExtractor={(item) =>
          item.session?.sessionId ?? `empty-week-${item.week}`
        }
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          if (focusedSectionIndex < 0 || focusedItemIndex < 0) return;

          sectionListRef.current?.getScrollResponder()?.scrollTo({
            animated: false,
            y: averageItemLength * index,
          });
          setTimeout(() => {
            sectionListRef.current?.scrollToLocation({
              animated: true,
              sectionIndex: focusedSectionIndex,
              // See the RN 0.86 workaround in the initial scroll above.
              itemIndex: focusedItemIndex + 1,
              viewPosition: 0.45,
            });
          }, 100);
        }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            <DetailCardRow
              label="Program"
              value={program.name}
              cardVariants={["multiline"]}
              trailingAccessory={
                <Link
                  href={`/(public)/(app)/program/form?programId=${program.programId}`}
                  asChild
                >
                  <PressableThemed
                    className="-mt-3 -mr-3 -mb-3 h-11 w-11 items-center justify-center"
                    accessibilityLabel={`Edit workout program ${program.name}`}
                  >
                    <Text maxFontSizeMultiplier={2.5} className="text-primary">
                      <MaterialCommunityIcons
                        name="information-variant-circle-outline"
                        size={22}
                      />
                    </Text>
                  </PressableThemed>
                </Link>
              }
            />
            <ScreenHeading>Workout Sessions</ScreenHeading>
          </>
        }
        renderSectionHeader={({ section: { collapsed, title, week } }) => (
          <CollapsibleSectionHeader
            title={title}
            collapsed={collapsed}
            onPress={() => toggleWeekCollapsed(week)}
          />
        )}
        renderItem={({ index, item: { collapsed, session }, section }) => (
          <CollapsibleSectionBody collapsed={collapsed}>
            {session ? (
              <Link
                href={`/(public)/(app)/program/${program.programId}/session/${session.sessionId}`}
                asChild
              >
                <NavigationCardRow
                  title={session.name}
                  leadingText={`Day ${getSessionWeekAndDay(session).day}`}
                  cardVariants={["multiline"]}
                  stack={{ index, size: section.sessionCount }}
                  cardClassName={
                    index === section.sessionCount - 1 ? "mb-6" : undefined
                  }
                  trailingText={session.status}
                  trailingTextClassName={
                    session.status === "Ready"
                      ? "text-primary"
                      : session.status === "Incomplete"
                        ? "text-warning"
                        : "text-muted"
                  }
                  accessibilityLabel={`Navigate to Day ${getSessionWeekAndDay(session).day} session ${session.name}, status ${session.status}`}
                />
              </Link>
            ) : program.sessions.length < 1 ? (
              <HelperText className="mb-6">
                Start tracking your exercises by planning a session.
              </HelperText>
            ) : null}
          </CollapsibleSectionBody>
        )}
      />
      <BottomActionBar
        label="Plan Workout Session"
        accessibilityLabel={`Plan new workout session for ${program.name}`}
        className="absolute bottom-0 z-10 w-full"
        onPress={() =>
          router.push(
            `/(public)/(app)/program/${program.programId}/session/form`,
          )
        }
      />
    </View>
  );
}
