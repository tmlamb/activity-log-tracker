import { useEffect } from "react";
import { useNativeVariable } from "react-native-css";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import { usePostHog } from "posthog-react-native";

export default function PublicLayout() {
  const posthog = usePostHog();
  const backgroundColor = useNativeVariable("--background") as string;
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    posthog.screen(pathname, params).catch((e) => posthog.captureException(e));
  }, [pathname, params, posthog]);

  return (
    <Stack
      screenOptions={{
        gestureEnabled: false,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        contentStyle: { backgroundColor },
      }}
    >
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}
