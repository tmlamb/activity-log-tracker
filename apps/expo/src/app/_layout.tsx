import "../global.css";

import { useEffect } from "react";
import { useNativeVariable } from "react-native-css";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as Updates from "expo-updates";
import { PostHogProvider } from "posthog-react-native";

import useWorkoutStore from "~/hooks/use-workout-store";
import { posthog } from "~/utils/posthog";

export default function RootLayout() {
  const hasHydrated = useWorkoutStore((state) => state.hasHydrated);
  const backgroundColor = useNativeVariable("--background") as string;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(backgroundColor).catch((e) =>
      posthog.captureException(e),
    );
  }, [backgroundColor]);

  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }

    let isMounted = true;

    async function loadUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (!update.isAvailable) {
          return;
        }

        const fetchedUpdate = await Updates.fetchUpdateAsync();

        if (isMounted && fetchedUpdate.isNew) {
          await Updates.reloadAsync();
        }
      } catch (e) {
        posthog.captureException(e);
      }
    }

    void loadUpdate();

    return () => {
      isMounted = false;
    };
  }, []);

  // Wait for Zustand store hydration before rendering
  if (!hasHydrated) {
    return null;
  }

  return (
    <PostHogProvider client={posthog}>
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
    </PostHogProvider>
  );
}
