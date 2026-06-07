import { SectionList } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import {
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import _ from "lodash";

import { NavigationCardRow, PrimaryCardAction } from "~/components/CardRow";
import GlassOverflowMenu from "~/components/GlassOverflowMenu";
import { HelperText, SectionHeading } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function DashboardScreen() {
  const router = useRouter();
  const programs = useWorkoutStore((state) => state.programs);

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
              stack={{ index, size: section.data.length }}
              accessibilityLabel={`Navigate to Workout Program ${item.name}`}
            />
          </Link>
        )}
        ListFooterComponent={
          <>
            {programs.length < 1 && (
              <>
                <HelperText
                  placement="listHeader"
                  className="leading-tight"
                  accessibilityRole="summary"
                >
                  To get started, create a new workout program to track your
                  sessions.
                </HelperText>
                <Link href="/(public)/(app)/program/form" asChild>
                  <PrimaryCardAction
                    label="Create Workout Program"
                    accessibilityLabel="Navigate to Create Workout Program Form"
                  />
                </Link>
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
