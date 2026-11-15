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
import { addDays, format, isSameMonth } from "date-fns";

import type { ProgramOverview } from "~/data/domain/program-timeline";
import BottomActionBar from "~/components/BottomActionBar";
import { DetailCardRow, NavigationCardRow } from "~/components/CardRow";
import {
  CollapsibleSection,
  CollapsibleSectionList,
} from "~/components/CollapsibleSection";
import { Text } from "~/components/font-scale-text";
import { HeaderIconAction } from "~/components/HeaderAction";
import PressableThemed from "~/components/PressableThemed";
import {
  HelperText,
  ScreenHeading,
  SectionHeading,
} from "~/components/Typography";
import {
  useProgramHeader,
  useProgramOverview,
  useProgramWeek,
} from "~/data/queries";

interface WeekItem {
  key: string;
  week: number;
  title: string;
  count: number;
  collapsedByDefault: boolean;
}

function WeekSessions({
  programId,
  week,
}: {
  programId: string;
  week: number;
}) {
  const sessions = useProgramWeek(programId, week)?.items ?? [];
  return (
    <View>
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
    </View>
  );
}

function WeekRow({
  programId,
  overview,
  item,
  initiallyOverridden,
  onOverride,
}: {
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
      <WeekSessions programId={programId} week={item.week} />
    </CollapsibleSection>
  );
}

export default function ProgramDetailScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const program = useProgramHeader(programId);
  const overview = useProgramOverview(programId);
  if (!program || !overview) return <Redirect href="/(public)/(app)" />;
  return <ProgramContent program={program} overview={overview} />;
}

function ProgramContent({
  program,
  overview,
}: {
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
