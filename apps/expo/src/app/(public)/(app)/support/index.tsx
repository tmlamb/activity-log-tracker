import { Alert, ScrollView, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { Stack, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";

import { PrimaryCardAction } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import { HeaderTextAction } from "~/components/HeaderAction";
import useExerciseStore from "~/hooks/use-exercise-store";
import useWorkoutStore from "~/hooks/use-workout-store";
import { parseWorkoutData, serializeWorkoutData } from "~/utils/workout-data";

export default function SupportScreen() {
  const router = useRouter();
  const resetExercises = useExerciseStore((state) => state.resetExercises);
  const {
    equipment,
    exercises,
    muscleGroups,
    programs,
    replaceWorkoutData,
    resetWorkoutStore,
  } = useWorkoutStore((state) => state);

  const exportWorkoutData = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Export Unavailable",
          "App data cannot be exported on this device.",
        );
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `activity-log-data-${date}.json`);
      file.create({ overwrite: true });
      file.write(
        serializeWorkoutData({ programs, exercises, equipment, muscleGroups }),
      );

      await Sharing.shareAsync(file.uri, {
        dialogTitle: "Export Activity Log Data",
        mimeType: "application/json",
        UTI: "public.json",
      });
    } catch {
      Alert.alert(
        "Export Failed",
        "App data could not be exported. Please try again.",
      );
    }
  };

  const selectWorkoutDataImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      const importedData = parseWorkoutData(await new File(asset.uri).text());

      Alert.alert(
        "Import App Data?",
        "This will permanently replace all workout programs, sessions, exercises, and equipment with the data in the selected file. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import App Data",
            style: "destructive",
            onPress: () => {
              resetExercises();
              replaceWorkoutData(importedData);
              router.back();
            },
          },
        ],
      );
    } catch {
      Alert.alert(
        "Import Failed",
        "The selected file is not a valid Activity Log data export. No app data was changed.",
      );
    }
  };

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
        <View>
          <PrimaryCardAction
            label="Export App Data"
            accessibilityLabel="Export app data"
            accessibilityHint="Opens sharing options for a JSON file containing workout programs, exercises, and equipment."
            onPress={() => void exportWorkoutData()}
            stack={{ index: 0, size: 2 }}
          />
          <PrimaryCardAction
            label="Import App Data"
            labelClassName="text-warning"
            accessibilityLabel="Import app data"
            accessibilityHint="Opens the device file picker to choose an Activity Log JSON export."
            onPress={() => void selectWorkoutDataImport()}
            stack={{ index: 1, size: 2 }}
          />
        </View>
        <View>
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
