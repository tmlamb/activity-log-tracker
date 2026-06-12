import { useEffect } from "react";
import { useNativeVariable } from "react-native-css";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";

import { captureException, posthog } from "~/utils/posthog";

export default function PublicLayout() {
  const backgroundColor = useNativeVariable("--background") as string;
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    posthog?.screen(pathname, params).catch(captureException);
  }, [pathname, params]);

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
