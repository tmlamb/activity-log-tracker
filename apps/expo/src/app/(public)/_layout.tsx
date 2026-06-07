import { useNativeVariable } from "react-native-css";
import { Stack } from "expo-router";

export default function PublicLayout() {
  const backgroundColor = useNativeVariable("--background") as string;

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
