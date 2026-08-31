import { useState } from "react";
import { SectionList, Text, View } from "react-native";
import { Link, Redirect, useLocalSearchParams, useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { addDays, format, isSameMonth } from "date-fns";
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
  showHeader: boolean;
  collapsed: boolean;
  sessionCount: number;
  data: WeekSectionItem[];
}

export default function ProgramDetailScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const programs = useWorkoutStore((state) => state.programs);
  const program = programs.find((p) => p.programId === programId);

  if (!program) {
    return <Redirect href="/(public)/(app)" />;
  }

  return <ProgramDetailScreenContent program={program} />;
}

function ProgramDetailScreenContent({
  program,
}: {
  program: WorkoutStore["programs"][number];
}) {
  const router = useRouter();
  const collapsibleSectionScroll = useCollapsibleSectionScroll();
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
    weekAndDayNumbersFromStart(programStart, session.start ?? now);
  const getWeekDateRange = (week: number) => {
    const start = addDays(programStart, (week - 1) * 7);
    const end = addDays(start, 6);

    return isSameMonth(start, end)
      ? `${format(start, "MMM d")}-${format(end, "d")}`
      : `${format(start, "MMM d")}-${format(end, "MMM d")}`;
  };

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
      const collapsed = collapsedFromState;
      const isCurrent = week === currentWeek;
      const data: WeekSectionItem[] = [{ week, collapsed, sessions }];

      return {
        sectionId,
        title: `${title}${isCurrent ? " (Now)" : ""}: ${getWeekDateRange(week)}`,
        week,
        showDay: true,
        showHeader: true,
        collapsed,
        sessionCount: sessions.length,
        data,
      };
    },
  );
  const plannedSection: WeekSection | undefined = plannedSessions.length
    ? (() => {
        return {
          sectionId: "planned",
          title: "Planned",
          week: 0,
          showDay: false,
          showHeader: false,
          collapsed: false,
          sessionCount: plannedSessions.length,
          data: [{ week: 0, collapsed: false, sessions: plannedSessions }],
        };
      })()
    : undefined;
  const sections = plannedSection
    ? [plannedSection, ...weeklySections]
    : weeklySections;

  return (
    <View className="flex-1">
      <SectionList
        contentContainerClassName="px-5 pt-36 pb-36"
        sections={sections}
        extraData={sectionCollapseOverrides}
        keyExtractor={(item) => `week-${item.week}`}
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
        renderSectionHeader={({ section }) => {
          if (!section.showHeader) return null;

          return (
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
          );
        }}
        renderItem={({ item: { collapsed, sessions }, section }) => (
          <CollapsibleSectionBody
            collapsed={collapsed}
            contentClassName={section.showHeader ? undefined : "pt-6"}
          >
            {sessions.map((session, index) => {
              const day = section.showDay
                ? getSessionWeekAndDay(session).day
                : undefined;

              return (
                <Link
                  key={session.sessionId}
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
