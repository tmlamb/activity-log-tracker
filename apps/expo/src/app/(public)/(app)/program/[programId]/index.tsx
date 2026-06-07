import { SectionList, View } from "react-native";
import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { differenceInCalendarDays } from "date-fns";
import _ from "lodash";

import type { Session } from "@activity-log/ui/utils";
import {
  normalizedLocalDate,
  weekAndDayFromStart,
} from "@activity-log/ui/utils";

import type { WorkoutStore } from "~/hooks/use-workout-store";
import {
  DetailCardRow,
  NavigationCardRow,
  PrimaryCardAction,
} from "~/components/CardRow";
import {
  HelperText,
  ScreenHeading,
  SectionHeading,
} from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

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
  const orderedByStart = _.orderBy(program.sessions, ["start"], ["asc"]);
  const programStart = orderedByStart[0]?.start ?? new Date();

  const sections: { title: string; data: (Session | undefined)[] }[] = _(
    orderedByStart,
  )
    .groupBy((session) =>
      weekAndDayFromStart(programStart, session.start ?? new Date()),
    )
    .map((data, title) => ({ title, data }))
    .value();

  const section = sections[sections.length - 1];

  if (
    sections.length > 0 &&
    section &&
    differenceInCalendarDays(
      normalizedLocalDate(new Date()),
      normalizedLocalDate(section.data[0]?.start ?? new Date()),
    ) === 0
  ) {
    section.title += " (Today)";
  } else {
    sections.push({
      title: `${weekAndDayFromStart(programStart, new Date())} (Today)`,
      data: [undefined],
    });
  }

  sections.reverse();

  return (
    <View className="flex-1">
      <SectionList
        scrollEnabled={program.sessions.length > 4}
        contentContainerClassName="px-5 pt-36 pb-18"
        sections={sections}
        keyExtractor={(session, index) =>
          session ? session.sessionId : String(index)
        }
        ListHeaderComponent={
          <>
            <DetailCardRow label="Program" value={program.name} />
            <ScreenHeading>Workout Sessions</ScreenHeading>
          </>
        }
        renderSectionHeader={({ section: { title } }) => (
          <SectionHeading>{title}</SectionHeading>
        )}
        renderItem={({ index, item, section }) => (
          <>
            {!item && (
              <>
                <Link
                  href={`/(public)/(app)/program/${program.programId}/session/form`}
                  asChild
                >
                  <PrimaryCardAction
                    label="Plan Workout Session"
                    className={
                      index === section.data.length - 1 &&
                      program.sessions.length
                        ? "mb-6"
                        : undefined
                    }
                    accessibilityLabel={`Plan new workout session for ${program.name}`}
                  />
                </Link>
                {program.sessions.length < 1 && (
                  <HelperText>
                    Start tracking your exercises by planning a session.
                  </HelperText>
                )}
              </>
            )}
            {item && (
              <Link
                href={`/(public)/(app)/program/${program.programId}/session/${item.sessionId}`}
                asChild
              >
                <NavigationCardRow
                  title={item.name}
                  stack={{
                    index,
                    size: section.title.includes("Today")
                      ? section.data.length + 1
                      : section.data.length,
                  }}
                  cardClassName={
                    index === section.data.length - 1 &&
                    !section.title.includes("Today")
                      ? "mb-6"
                      : undefined
                  }
                  trailingText={item.status}
                  trailingTextClassName={
                    item.status === "Ready" ? "text-primary" : "text-muted"
                  }
                  accessibilityLabel={`Navigate to session ${item.name}, status ${item.status}`}
                />
              </Link>
            )}
            {section.title.includes("Today") &&
              index === section.data.length - 1 &&
              item && (
                <Link
                  href={`/(public)/(app)/program/${program.programId}/session/form`}
                  asChild
                >
                  <PrimaryCardAction
                    label="Plan Workout Session"
                    className="mb-6"
                    stack={{
                      index: section.data.length,
                      size: section.data.length + 1,
                    }}
                    accessibilityLabel="Navigate to create new workout session form"
                  />
                </Link>
              )}
          </>
        )}
      />
    </View>
  );
}
