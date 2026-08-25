import "../global.css";

import { useEffect } from "react";
import { AppState } from "react-native";
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

const sessionCleanupIntervalMs = 60 * 1000;

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

  useEffect(() => {
    if (!hasHydrated) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    const stopCleanup = () => {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
    };
    const cleanup = () => {
      useWorkoutStore.getState().cleanupInactiveSessions();
    };
    const startCleanup = () => {
      stopCleanup();
      cleanup();
      interval = setInterval(cleanup, sessionCleanupIntervalMs);
    };

    if (AppState.currentState === "active") {
      startCleanup();
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        startCleanup();
      } else {
        stopCleanup();
      }
    });

    return () => {
      subscription.remove();
      stopCleanup();
    };
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
