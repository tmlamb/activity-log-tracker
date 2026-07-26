import "../global.css";

import { useEffect } from "react";
import { useNativeVariable } from "react-native-css";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { PostHogProvider } from "posthog-react-native";

import useWorkoutStore from "~/hooks/use-workout-store";
import { captureException, posthog } from "~/utils/posthog";

SplashScreen.preventAutoHideAsync().catch(captureException);
SplashScreen.setOptions({ fade: true, duration: 400 });

export default function RootLayout() {
  const hasHydrated = useWorkoutStore((state) => state.hasHydrated);
  const backgroundColor = useNativeVariable("--background") as string;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(backgroundColor).catch(captureException);
  }, [backgroundColor]);

  useEffect(() => {
    if (hasHydrated) {
      SplashScreen.hideAsync().catch(captureException);
    }
  }, [hasHydrated]);

  // Wait for Zustand store hydration before rendering
  if (!hasHydrated) {
    return null;
  }

  const app = (
    <KeyboardProvider preload={false}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor },
        }}
      >
        <Stack.Screen name="(public)" />
      </Stack>
    </KeyboardProvider>
  );

  return posthog ? (
    <PostHogProvider client={posthog}>{app}</PostHogProvider>
  ) : (
    app
  );
}
