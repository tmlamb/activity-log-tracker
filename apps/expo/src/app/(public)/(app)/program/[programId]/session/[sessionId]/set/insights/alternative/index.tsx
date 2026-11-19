import { Stack } from "expo-router";

import ExerciseInsightsScreen from "~/components/ExerciseInsightsScreen";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import useRouter from "~/hooks/use-router";

/** An alternative exercise's insights, opened as a modal from its activity's. */
export default function AlternativeExerciseInsightsScreen() {
  const router = useRouter();
  const headerButton = useHeaderButtonProps();
  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          {...headerButton("primary", "bold")}
          accessibilityLabel="Close exercise insights"
          onPress={() => router.back()}
        >
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ExerciseInsightsScreen />
    </>
  );
}
