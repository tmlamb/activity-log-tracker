import "../global.css";

import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { useNativeVariable } from "react-native-css";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { PostHogProvider } from "posthog-react-native";

import { FontScaleProvider } from "~/components/font-scale-text";
import { SQLiteBootstrap } from "~/components/sqlite-bootstrap";
import { captureException, posthog } from "~/utils/posthog";

SplashScreen.preventAutoHideAsync().catch(captureException);
SplashScreen.setOptions({ fade: true, duration: 400 });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const backgroundColor = useNativeVariable("--background") as string;
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(backgroundColor).catch(captureException);
  }, [backgroundColor]);
  const app = (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <KeyboardProvider preload={false}>
        <StatusBar style="auto" />
        <FontScaleProvider>
          <SQLiteBootstrap>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor },
              }}
            >
              <Stack.Screen name="(public)" />
            </Stack>
          </SQLiteBootstrap>
        </FontScaleProvider>
      </KeyboardProvider>
    </ThemeProvider>
  );
  return posthog ? (
    <PostHogProvider client={posthog}>{app}</PostHogProvider>
  ) : (
    app
  );
}
