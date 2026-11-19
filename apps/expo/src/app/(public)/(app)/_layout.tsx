import { useNativeVariable } from "react-native-css";
import { Stack } from "expo-router";

/**
 * At most one of each screen in the stack: pushing a screen that's already
 * open reuses it. A quick second tap on a link or button then can't stack the
 * same screen twice. List every route here so each gets this.
 */
const singular = (name: string) => name;

export default function AppLayout() {
  const backgroundColor = useNativeVariable("--background") as string;
  const foregroundColor = useNativeVariable("--foreground") as string;
  const primaryColor = useNativeVariable("--primary") as string;

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerTitleStyle: { color: foregroundColor },
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTintColor: primaryColor,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor },
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        dangerouslySingular={singular}
        name="index"
        options={{
          title: "Workout Activity Log",
          headerLargeTitle: true,
          headerLargeTitleStyle: { color: foregroundColor },
        }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/settings/index"
        options={{ title: "Manage Programs" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/[programId]/index"
        options={{
          title: "Workout Program",
        }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/[programId]/insights/index"
        options={{ title: "Program Insights" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/[programId]/session/[sessionId]/index"
        options={{ title: "Workout Session" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/[programId]/session/[sessionId]/set/index"
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/[programId]/session/[sessionId]/set/insights/index"
        options={{
          title: "Exercise Insights",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="support/index"
        options={{ title: "Support" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="exercise/settings/index"
        options={{
          title: "Manage Exercises",
        }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="exercise/muscles/index"
        options={{ title: "Muscle Groups" }}
      />
      {/* Modals */}
      <Stack.Screen
        dangerouslySingular={singular}
        name="equipment/index"
        options={{ title: "Equipment", presentation: "modal" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/form/index"
        options={{ title: "Add Program", presentation: "modal" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/[programId]/session/form/index"
        options={{ title: "Add Session", presentation: "modal" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/[programId]/session/form/advanced/index"
        options={{ title: "Advanced Settings", presentation: "modal" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="program/[programId]/session/[sessionId]/set/insights/alternative/index"
        options={{ title: "Exercise Insights", presentation: "modal" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="exercise/select/index"
        options={{ title: "Select Exercise", presentation: "modal" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="exercise/form/index"
        options={{ title: "Add Exercise", presentation: "modal" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="load/index"
        options={{ title: "Select Load", presentation: "modal" }}
      />
      <Stack.Screen
        dangerouslySingular={singular}
        name="session/select/index"
        options={{ title: "Select Template", presentation: "modal" }}
      />
    </Stack>
  );
}
