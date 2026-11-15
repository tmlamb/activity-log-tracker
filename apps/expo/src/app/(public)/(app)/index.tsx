import { Platform } from "react-native";
import { Link, Stack, useRouter } from "expo-router";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import type { ProgramSummary } from "~/data/repositories/programs";
import { NavigationCardRow, PrimaryCardAction } from "~/components/CardRow";
import { QueryStatus } from "~/components/query-status";
import { LegendListStyled } from "~/components/Styled";
import { HelperText, SectionHeading } from "~/components/Typography";
import { useApplicationDataRuntime } from "~/data/react/application-data";
import { useProgramSummaries } from "~/data/react/program-queries";

export default function DashboardScreen() {
  const runtime = useApplicationDataRuntime();
  return <Dashboard runtime={runtime} />;
}

function Dashboard({ runtime }: { runtime: ApplicationDataRuntime }) {
  const query = useProgramSummaries(runtime);
  if (query.data === undefined)
    return (
      <QueryStatus error={query.isError} onRetry={() => void query.refetch()} />
    );
  return <DashboardContent programs={query.data} />;
}

function DashboardContent({ programs }: { programs: ProgramSummary[] }) {
  const router = useRouter();
  const managementMenuItems = [
    {
      key: "programs",
      label: "Workout Programs",
      systemImage: "square.stack.3d.up" as const,
      onPress: () => router.push("/(public)/(app)/program/settings"),
    },
    {
      key: "exercises",
      label: "Exercises",
      systemImage: "figure.strengthtraining.traditional" as const,
      onPress: () => router.push("/(public)/(app)/exercise/settings"),
    },
    {
      key: "equipment",
      label: "Equipment",
      systemImage: "scalemass" as const,
      onPress: () => router.push("/(public)/(app)/equipment"),
    },
    {
      key: "support",
      label: "Support",
      systemImage: "questionmark.circle" as const,
      onPress: () => router.push("/(public)/(app)/support"),
    },
  ];

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          accessibilityLabel="Open quick settings menu"
          icon={Platform.OS === "ios" ? "ellipsis" : undefined}
        >
          {Platform.OS === "android" && (
            <Stack.Toolbar.Label>More</Stack.Toolbar.Label>
          )}
          {managementMenuItems.map((item) => (
            <Stack.Toolbar.MenuAction
              key={item.key}
              icon={item.systemImage}
              onPress={item.onPress}
            >
              {item.label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <LegendListStyled
        className="flex-1"
        keyExtractor={(program) => program.id}
        bounces={true}
        contentContainerClassName="px-5"
        contentInsetAdjustmentBehavior="automatic"
        recycleItems={false}
        maintainVisibleContentPosition={false}
        data={programs}
        estimatedItemSize={53}
        extraData={programs.length}
        ListHeaderComponent={
          programs.length ? (
            <SectionHeading className="mt-2">Workout Programs</SectionHeading>
          ) : null
        }
        renderItem={({ index, item }) => (
          <Link
            href={`/(public)/(app)/program/${encodeURIComponent(item.id)}`}
            asChild
          >
            <NavigationCardRow
              title={item.name}
              cardVariants={["multiline"]}
              stack={{ index, size: programs.length }}
              accessibilityLabel={`Navigate to Workout Program ${item.name}`}
            />
          </Link>
        )}
        ListFooterComponent={
          <>
            {programs.length < 1 && (
              <>
                <Link
                  href="/(public)/(app)/program/form"
                  asChild
                  className="mt-2"
                >
                  <PrimaryCardAction
                    label="Create Workout Program"
                    accessibilityLabel="Navigate to Create Workout Program Form"
                  />
                </Link>
                <HelperText
                  className="leading-tight"
                  accessibilityRole="summary"
                >
                  Create a program to start planning workout sessions.
                </HelperText>
              </>
            )}
            {programs.length > 0 &&
              programs.reduce(
                (total, program) => total + program.sessionCount,
                0,
              ) < 4 && (
                <HelperText
                  className="mr-0 ml-5 leading-tight"
                  accessibilityRole="summary"
                >
                  Select a program to start planning workout sessions.
                </HelperText>
              )}
          </>
        }
      />
    </>
  );
}
