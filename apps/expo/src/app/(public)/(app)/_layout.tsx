import { useNativeVariable } from "react-native-css";
import { Stack } from "expo-router";

export default function AppLayout() {
  const backgroundColor = useNativeVariable("--background") as string;
  const foregroundColor = useNativeVariable("--foreground") as string;
  const primaryColor = useNativeVariable("--primary") as string;

  return (
    <Stack
      screenOptions={{
        gestureEnabled: false,
        headerTitleAlign: "center",
        headerTitleStyle: { color: foregroundColor },
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTintColor: primaryColor,
        contentStyle: { backgroundColor },
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Workout Activity Log",
          headerLargeTitle: true,
          headerLargeTitleStyle: { color: foregroundColor },
        }}
      />
      <Stack.Screen
        name="program/settings/index"
        options={{ title: "Manage Programs" }}
      />
      <Stack.Screen
        name="program/[programId]/index"
        options={{
          title: "Workout Program",
        }}
      />
      <Stack.Screen
        name="program/[programId]/session/[sessionId]/index"
        options={{ title: "Workout Session" }}
      />
      <Stack.Screen
        name="equipment/index"
        options={{ title: "Manage Equipment" }}
      />
      <Stack.Screen name="support/index" options={{ title: "Support" }} />
      <Stack.Screen
        name="exercise/settings/index"
        options={{
          title: "Manage Exercises",
        }}
      />
      {/* Modals */}
      <Stack.Screen
        name="program/form/index"
        options={{ title: "Add Program", presentation: "modal" }}
      />
      <Stack.Screen
        name="program/[programId]/session/form/index"
        options={{ title: "Add Session", presentation: "modal" }}
      />
      <Stack.Screen
        name="exercise/select/index"
        options={{ title: "Select Exercise", presentation: "modal" }}
      />
      <Stack.Screen
        name="exercise/form/index"
        options={{ title: "Add Exercise", presentation: "modal" }}
      />
      <Stack.Screen
        name="load/index"
        options={{ title: "Select Load", presentation: "modal" }}
      />
      <Stack.Screen
        name="session/select/index"
        options={{ title: "Select Template", presentation: "modal" }}
      />
    </Stack>
  );
}
