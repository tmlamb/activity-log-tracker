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
  useCollapsibleSectionScroll,
} from "~/components/CollapsibleSection";
import PressableThemed from "~/components/PressableThemed";
import {
  HelperText,
  ScreenHeading,
  SectionHeading,
} from "~/components/Typography";
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
  sessions: Session[];
}

interface WeekSection {
  sectionId: string;
  title: string;
  week: number;
  showDay: boolean;
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
  const collapsibleSectionScroll = useCollapsibleSectionScroll();
  const sessionOffsetsRef = useRef(new Map<string, number>());
  const [sectionCollapseOverrides, setSectionCollapseOverrides] = useState<
    Set<string>
  >(() => new Set());
  const now = new Date();
  const orderedByStart = _.orderBy(program.sessions, ["start"], ["asc"]);
  const programStart =
    orderedByStart.find((session) => session.start)?.start ?? now;
  const plannedSessions = _.orderBy(
    program.sessions.filter((session) => session.status === "Planned"),
    [(session) => session.lastActivityAt?.getTime() ?? 0],
    ["desc"],
  );

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
  }[] = _(orderedByStart.filter((session) => session.status !== "Planned"))
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

  const toggleSectionCollapsed = (sectionId: string) => {
    collapsibleSectionScroll.prepareSectionToggle();
    setSectionCollapseOverrides((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const weeklySections: WeekSection[] = weekSections.map(
    ({ title, week, sessions }, index) => {
      const sectionId = `week-${week}`;
      const collapsedByDefault = index > currentWeekSectionIndex;
      const collapsedFromState = sectionCollapseOverrides.has(sectionId)
        ? !collapsedByDefault
        : collapsedByDefault;
      const containsFocusedSession = sessions.some(
        (session) => session.sessionId === focusSessionId,
      );
      const collapsed = containsFocusedSession ? false : collapsedFromState;
      const isCurrent = week === currentWeek;
      const data: WeekSectionItem[] = [{ week, collapsed, sessions }];

      return {
        sectionId,
        title: `${title}${isCurrent ? " (Current)" : ""}`,
        week,
        showDay: true,
        collapsed,
        sessionCount: sessions.length,
        data,
      };
    },
  );
  const plannedSection: WeekSection | undefined = plannedSessions.length
    ? (() => {
        const collapsed = sectionCollapseOverrides.has("planned");

        return {
          sectionId: "planned",
          title: "Planned",
          week: 0,
          showDay: false,
          collapsed,
          sessionCount: plannedSessions.length,
          data: [{ week: 0, collapsed, sessions: plannedSessions }],
        };
      })()
    : undefined;
  const sections = plannedSection
    ? [plannedSection, ...weeklySections]
    : weeklySections;

  const focusedSectionIndex = focusSessionId
    ? sections.findIndex((section) =>
        section.data.some((item) =>
          item.sessions.some((session) => session.sessionId === focusSessionId),
        ),
      )
    : -1;
  const focusedSection = sections[focusedSectionIndex];
  const focusedItemIndex = focusSessionId
    ? (focusedSection?.data.findIndex((item) =>
        item.sessions.some((session) => session.sessionId === focusSessionId),
      ) ?? -1)
    : -1;
  const focusedWeek = focusedSection?.week;
  const focusedSectionId = focusedSection?.sectionId;

  useEffect(() => {
    if (!isFocused || !focusSessionId) {
      return;
    }

    if (
      focusedSectionIndex < 0 ||
      focusedItemIndex < 0 ||
      focusedWeek == null ||
      focusedSectionId == null
    ) {
      const clearFocusTimeout = setTimeout(
        () => router.setParams({ focusSessionId: undefined }),
        0,
      );
      return () => clearTimeout(clearFocusTimeout);
    }

    const scrollTimeout = setTimeout(() => {
      const collapsedByDefault =
        focusedSectionId !== "planned" && focusedWeek < currentWeek;
      setSectionCollapseOverrides((current) => {
        const hasOverride = current.has(focusedSectionId);
        if (hasOverride === collapsedByDefault) return current;

        const next = new Set(current);
        if (collapsedByDefault) {
          next.add(focusedSectionId);
        } else {
          next.delete(focusedSectionId);
        }
        return next;
      });
      sectionListRef.current?.recordInteraction();
      sectionListRef.current?.scrollToLocation({
        animated: false,
        sectionIndex: focusedSectionIndex,
        // RN 0.86 omits the current section header from its flattened index.
        itemIndex: focusedItemIndex + 1,
        viewPosition: 0.45,
      });
    }, 400);
    const sessionScrollTimeout = setTimeout(() => {
      const sessionOffset = sessionOffsetsRef.current.get(focusSessionId);
      if (sessionOffset == null) return;

      sectionListRef.current?.getScrollResponder()?.scrollTo({
        y: Math.max(
          0,
          collapsibleSectionScroll.getScrollOffset() +
            sessionOffset -
            collapsibleSectionScroll.getListHeight() * 0.35,
        ),
        animated: true,
      });
    }, 750);
    const clearFocusTimeout = setTimeout(
      () => router.setParams({ focusSessionId: undefined }),
      2000,
    );

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(sessionScrollTimeout);
      clearTimeout(clearFocusTimeout);
    };
  }, [
    currentWeek,
    focusSessionId,
    focusedItemIndex,
    focusedSectionIndex,
    focusedSectionId,
    focusedWeek,
    isFocused,
    collapsibleSectionScroll,
    router,
  ]);

  return (
    <View className="flex-1">
      <SectionList
        ref={sectionListRef}
        onLayout={collapsibleSectionScroll.onListLayout}
        onScroll={collapsibleSectionScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerClassName="px-5 pt-36 pb-36"
        sections={sections}
        extraData={sectionCollapseOverrides}
        keyExtractor={(item) => `week-${item.week}`}
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
        renderSectionHeader={({ section }) => (
          <View>
            {section.sessionCount ? (
              <CollapsibleSectionHeader
                title={section.title}
                collapsed={section.collapsed}
                titleClassName="leading-tight"
                onPress={() => toggleSectionCollapsed(section.sectionId)}
              />
            ) : (
              <SectionHeading placement="inline" className="mx-5 pt-3 pb-2">
                {section.title}
              </SectionHeading>
            )}
          </View>
        )}
        renderItem={({ item: { collapsed, sessions }, section }) => (
          <CollapsibleSectionBody collapsed={collapsed}>
            {sessions.map((session, index) => {
              const day = section.showDay
                ? getSessionWeekAndDay(session).day
                : undefined;

              return (
                <View
                  key={session.sessionId}
                  onLayout={(event) => {
                    sessionOffsetsRef.current.set(
                      session.sessionId,
                      event.nativeEvent.layout.y,
                    );
                  }}
                >
                  <Link
                    href={`/(public)/(app)/program/${program.programId}/session/${session.sessionId}`}
                    asChild
                  >
                    <NavigationCardRow
                      title={session.name}
                      leadingText={day == null ? undefined : `Day ${day}`}
                      cardVariants={["multiline"]}
                      stack={{ index, size: sessions.length }}
                      cardClassName={
                        index === sessions.length - 1 ? "mb-3" : undefined
                      }
                      trailingText={session.status}
                      trailingTextClassName={
                        session.status === "Ready"
                          ? "text-primary"
                          : session.status === "Incomplete"
                            ? "text-warning"
                            : "text-muted"
                      }
                      accessibilityLabel={`Navigate to ${day == null ? "planned" : `Day ${day}`} session ${session.name}, status ${session.status}`}
                    />
                  </Link>
                </View>
              );
            })}
            {program.sessions.length < 1 && (
              <HelperText className="mb-6">
                Start tracking your exercises by planning a session.
              </HelperText>
            )}
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
