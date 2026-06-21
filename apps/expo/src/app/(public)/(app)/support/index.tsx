import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import ConfirmButton from "~/components/ConfirmButton";
import { HeaderTextAction } from "~/components/HeaderAction";
import { HelperText, SectionHeading } from "~/components/Typography";
import useExerciseStore from "~/hooks/use-exercise-store";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function SupportScreen() {
  const router = useRouter();
  const resetExercises = useExerciseStore((state) => state.resetExercises);
  const resetWorkoutStore = useWorkoutStore((state) => state.resetWorkoutStore);

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <HeaderTextAction
              label="Done"
              onPress={() => router.back()}
              accessibilityLabel="Close Support"
              color="foreground"
            />
          ),
        }}
      />
      <ScrollView contentContainerClassName="px-5 pt-34 gap-6 pb-18">
        <HelperText placement="blockStart">
          Use this page if you need to start over with a clean app state.
        </HelperText>

        <View>
          <SectionHeading>Reset</SectionHeading>
          <ConfirmButton
            accessibilityLabel="Reset all app data"
            title="Reset App Data?"
            message="This will permanently delete all workout programs, sessions, exercises, and equipment settings. Equipment will be restored to the default barbell and plate inventory."
            confirmText="Reset App Data"
            onConfirm={() => {
              resetExercises();
              resetWorkoutStore();
              router.back();
            }}
          >
            Reset App Data
          </ConfirmButton>
        </View>
      </ScrollView>
    </>
  );
}
