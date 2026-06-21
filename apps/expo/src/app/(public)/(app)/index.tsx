import { Platform, SectionList } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import _ from "lodash";

import { NavigationCardRow, PrimaryCardAction } from "~/components/CardRow";
import { HelperText, SectionHeading } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function DashboardScreen() {
  const router = useRouter();
  const programs = useWorkoutStore((state) => state.programs);
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
      <SectionList
        keyExtractor={(program) => program.programId}
        bounces={true}
        contentContainerClassName="px-5"
        contentInsetAdjustmentBehavior="automatic"
        sections={[{ title: "Workout Programs", data: programs }]}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { data } }) =>
          data.length ? (
            <SectionHeading className="mt-2">Workout Programs</SectionHeading>
          ) : null
        }
        renderItem={({ index, item, section }) => (
          <Link href={`/(public)/(app)/program/${item.programId}`} asChild>
            <NavigationCardRow
              title={item.name}
              stack={{ index, size: section.data.length }}
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
              _.sumBy(programs, (o) => o.sessions.length) < 4 && (
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
