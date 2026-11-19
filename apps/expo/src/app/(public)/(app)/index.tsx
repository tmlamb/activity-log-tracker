import { Platform } from "react-native";
import { Link, Stack } from "expo-router";

import { NavigationCardRow, PrimaryCardAction } from "~/components/CardRow";
import { LegendListStyled } from "~/components/Styled";
import { HelperText, SectionHeading } from "~/components/Typography";
import { useProgramSummaries } from "~/data/queries";
import useRouter from "~/hooks/use-router";

export default function DashboardScreen() {
  const router = useRouter();
  const programs = useProgramSummaries();
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
