import{SectionList} from "react-native";
import *as Application from "expo-application";
import{Link, Stack, useRouter} from "expo-router";
import *as Updates from "expo-updates";
import{
    Feather,
    FontAwesome6,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import _ from "lodash";

import{NavigationCardRow, PrimaryCardAction} from "~/components/CardRow";
import GlassOverflowMenu from "~/components/GlassOverflowMenu";
import{HelperText, SectionHeading} from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function DashboardScreen() {
  const router = useRouter();
  const programs = useWorkoutStore((state) = > state.programs);
  const updateId = Updates.updateId ?.slice(0, 8) ? ? "embedded";

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <GlassOverflowMenu
              items={[
                {
                  key: "programs",
                  label: "Workout Programs",
                  icon: <Feather name="layers" size={20} />,
                  systemImage: "square.stack.3d.up",
                  accessibilityLabel: "Manage workout programs",
                  onPress: () =>
                    router.push("/(public)/(app)/program/settings"),
                },
                {
                  key: "exercises",
                  label: "Exercises",
                  icon: (
                    <MaterialCommunityIcons name="weight-lifter" size={20} />
                  ),
                  systemImage: "figure.strengthtraining.traditional",
                  accessibilityLabel: "Manage exercises",
                  onPress: () =>
                    router.push("/(public)/(app)/exercise/settings"),
                },
                {
                  key: "equipment",
                  label: "Equipment",
                  icon: <FontAwesome6 name="weight-hanging" size={20} />,
                  systemImage: "scalemass",
                  accessibilityLabel: "Manage equipment",
                  onPress: () => router.push("/(public)/(app)/equipment"),
                },
              ]}
            />
          ),
        }}
      />
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
              stack={
    {
      index, size : section.data.length
    }}
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
                  Create a program to start tracking workout sessions.
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
            <HelperText className="mt-8 text-center text-xs leading-tight">
              v{Application.nativeApplicationVersion ?? "unknown"} b
              {Application.nativeBuildVersion ?? "unknown"} channel{" "}
              {Updates.channel ?? "unknown"} runtime{" "}
              {Updates.runtimeVersion ?? "unknown"} update {updateId}
            </HelperText>
          </>
        }
      />
    </>
  );
}
