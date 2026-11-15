import { useRef, useState } from "react";
import { View } from "react-native";
import {
  Link,
  Redirect,
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, isSameMonth } from "date-fns";

import type { ProgramOverview } from "~/data/domain/program-timeline";
import type { ApplicationDataRuntime } from "~/data/react/application-data";
import { workoutKeys } from "~/data/cache/keys";
import { useApplicationDataSnapshot } from "~/data/react/application-data";
import {
  useProgramHeader,
  useProgramOverview,
  useProgramWeek,
} from "~/data/react/program-queries";
import BottomActionBar from "./BottomActionBar";
import { DetailCardRow, NavigationCardRow, PrimaryCardAction } from "./CardRow";
import {
  CollapsibleSection,
  CollapsibleSectionList,
} from "./CollapsibleSection";
import { Text } from "./font-scale-text";
import { HeaderIconAction } from "./HeaderAction";
import PressableThemed from "./PressableThemed";
import { SQLiteQueryStatus } from "./sqlite-query-status";
import { HelperText, ScreenHeading, SectionHeading } from "./Typography";

interface WeekItem {
  key: string;
  week: number;
  title: string;
  count: number;
  collapsedByDefault: boolean;
}

function WeekSessions({
  runtime,
  programId,
  overview,
  week,
  expanded,
}: {
  runtime: ApplicationDataRuntime;
  programId: string;
  overview: ProgramOverview;
  week: number;
  expanded: boolean;
}) {
  const { generation } = useApplicationDataSnapshot(runtime);
  const cache = useQueryClient();
  const query = useProgramWeek(
    runtime,
    programId,
    week,
    overview.programStartMs,
    overview.currentWeek,
    expanded,
  );
  if (query.data === undefined)
    return (
      <View className="gap-3 pb-3">
        <HelperText>
          {query.isError ? "Unable to load sessions." : "Loading sessions…"}
        </HelperText>
        {query.isError && (
          <PrimaryCardAction
            label="Try Again"
            accessibilityLabel="Retry loading sessions"
            onPress={() => void query.refetch()}
          />
        )}
      </View>
    );
  const sessions = query.data.pages.flatMap((page) => page.items);
  const hasPreviousPages = query.data.pageParams[0] !== undefined;
  const queryKey = workoutKeys.programWeek(
    generation,
    programId,
    week,
    overview.programStartMs,
    overview.currentWeek,
  );
  return (
    <View>
      {hasPreviousPages && (
        <PrimaryCardAction
          label="Back to First Page"
          accessibilityLabel="Return to the first sessions in this week"
          onPress={() => {
            void cache.resetQueries({ queryKey, exact: true });
          }}
        />
      )}
      {sessions.map((session, index) => (
        <Link
          key={session.id}
          href={`/(public)/(app)/program/${encodeURIComponent(programId)}/session/${encodeURIComponent(session.id)}`}
          asChild
        >
          <NavigationCardRow
            title={session.name}
            leadingText={
              session.day === null ? undefined : `Day ${session.day}`
            }
            leadingTextClassName="w-[46px] tabular-nums"
            leadingTextAllowFontScaling={false}
            cardVariants={["multiline"]}
            stack={{ index, size: sessions.length }}
            cardClassName={index === sessions.length - 1 ? "mb-3" : undefined}
            trailingText={session.status}
            trailingTextClassName={
              session.status === "Ready"
                ? "text-primary"
                : session.status === "Incomplete"
                  ? "text-warning"
                  : "text-muted"
            }
            accessibilityLabel={`Navigate to ${session.day === null ? "planned" : `Day ${session.day}`} session ${session.name}, status ${session.status}`}
          />
        </Link>
      ))}
      {query.isFetchNextPageError && (
        <HelperText accessibilityRole="alert">
          Unable to load more sessions.
        </HelperText>
      )}
      {query.hasNextPage && (
        <PrimaryCardAction
          label={query.isFetchingNextPage ? "Loading…" : "Load More Sessions"}
          disabled={query.isFetchingNextPage}
          accessibilityLabel="Load more sessions in this week"
          onPress={() => void query.fetchNextPage()}
        />
      )}
    </View>
  );
}

function WeekRow({
  runtime,
  programId,
  overview,
  item,
  initiallyOverridden,
  onOverride,
}: {
  runtime: ApplicationDataRuntime;
  programId: string;
  overview: ProgramOverview;
  item: WeekItem;
  initiallyOverridden: boolean;
  onOverride: (key: string, overridden: boolean) => void;
}) {
  const [overridden, setOverridden] = useState(initiallyOverridden);
  const collapsed = overridden
    ? !item.collapsedByDefault
    : item.collapsedByDefault;
  if (item.count === 0)
    return (
      <View>
        <SectionHeading placement="inline" className="mx-5 pt-3 pb-2">
          {item.title}
        </SectionHeading>
        {overview.sessionCount === 0 && (
          <HelperText className="mb-6">
            Start tracking your exercises by planning a session.
          </HelperText>
        )}
      </View>
    );
  return (
    <CollapsibleSection
      title={item.title}
      collapsed={collapsed}
      premeasureCollapsedContent={false}
      titleClassName="leading-tight"
      onCollapsedChange={(next) => {
        const changed = next !== item.collapsedByDefault;
        onOverride(item.key, changed);
        setOverridden(changed);
      }}
    >
      <WeekSessions
        runtime={runtime}
        programId={programId}
        overview={overview}
        week={item.week}
        expanded={!collapsed}
      />
    </CollapsibleSection>
  );
}

export function SQLiteProgramDetail({
  runtime,
}: {
  runtime: ApplicationDataRuntime;
}) {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const header = useProgramHeader(runtime, programId);
  const overview = useProgramOverview(runtime, programId);
  if (header.data === undefined || overview.data === undefined)
    return (
      <SQLiteQueryStatus
        error={header.isError || overview.isError}
        onRetry={() => {
          void header.refetch();
          void overview.refetch();
        }}
      />
    );
  if (header.data === null || overview.data === null)
    return <Redirect href="/(public)/(app)" />;
  return (
    <ProgramContent
      runtime={runtime}
      program={header.data}
      overview={overview.data}
    />
  );
}

function ProgramContent({
  runtime,
  program,
  overview,
}: {
  runtime: ApplicationDataRuntime;
  program: { id: string; name: string };
  overview: ProgramOverview;
}) {
  const router = useRouter();
  const overrides = useRef(new Set<string>());
  const currentIndex = overview.weeks.findIndex(
    ({ week }) => week === overview.currentWeek,
  );
  const weeks: WeekItem[] = overview.weeks.map(
    ({ week, sessionCount }, index) => {
      const start = addDays(new Date(overview.programStartMs), (week - 1) * 7);
      const end = addDays(start, 6);
      const dateRange = isSameMonth(start, end)
        ? `${format(start, "MMM d")}-${format(end, "d")}`
        : `${format(start, "MMM d")}-${format(end, "MMM d")}`;
      return {
        key: `week-${week}`,
        week,
        count: sessionCount,
        collapsedByDefault: index > currentIndex,
        title: `Week ${week}${week === overview.currentWeek ? " (Now)" : ""}: ${dateRange}`,
      };
    },
  );
  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link
              href={`/(public)/(app)/program/${encodeURIComponent(program.id)}/insights`}
              asChild
            >
              <HeaderIconAction
                className="rounded-full"
                accessibilityLabel={`View insights for ${program.name}`}
              >
                <Text maxFontSizeMultiplier={2.5} className="text-primary">
                  <MaterialCommunityIcons
                    name="chart-timeline-variant-shimmer"
                    size={24}
                  />
                </Text>
              </HeaderIconAction>
            </Link>
          ),
        }}
      />
      <CollapsibleSectionList
        className="flex-1"
        contentContainerClassName="px-5 pt-5 pb-36"
        contentInsetAdjustmentBehavior="automatic"
        data={weeks}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <>
            <DetailCardRow
              label="Program"
              value={program.name}
              cardVariants={["multiline"]}
              trailingAccessory={
                <Link
                  href={`/(public)/(app)/program/form?programId=${encodeURIComponent(program.id)}`}
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
        renderItem={({ item }) => (
          <WeekRow
            runtime={runtime}
            programId={program.id}
            overview={overview}
            item={item}
            initiallyOverridden={overrides.current.has(item.key)}
            onOverride={(key, overridden) => {
              if (overridden) overrides.current.add(key);
              else overrides.current.delete(key);
            }}
          />
        )}
      />
      <BottomActionBar
        label="Plan Workout Session"
        accessibilityLabel={`Plan new workout session for ${program.name}`}
        onPress={() =>
          router.push(
            `/(public)/(app)/program/${encodeURIComponent(program.id)}/session/form`,
          )
        }
      />
    </View>
  );
}
