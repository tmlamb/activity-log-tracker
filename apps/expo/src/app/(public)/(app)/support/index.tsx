import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import type { ActivityLogBackupStores } from "~/utils/app-data-backup";
import { PrimaryCardAction } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import { HeaderTextAction } from "~/components/HeaderAction";
import useExerciseStore from "~/hooks/use-exercise-store";
import usePendingSelection from "~/hooks/use-pending-selection";
import useWorkoutStore from "~/hooks/use-workout-store";
import {
  parseActivityLogBackup,
  serializeActivityLogBackup,
} from "~/utils/app-data-backup";
import {
  downloadBackupFile,
  pickBackupFileContents,
} from "~/utils/backup-file";

export default function SupportScreen() {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<"backup" | "restore">();
  const resetExercises = useExerciseStore((state) => state.resetExercises);
  const resetWorkoutStore = useWorkoutStore((state) => state.resetWorkoutStore);

  const backupData = async () => {
    setActiveAction("backup");

    try {
      const now = new Date();
      const workoutState = useWorkoutStore.getState();
      const exerciseState = useExerciseStore.getState();
      const contents = serializeActivityLogBackup(
        {
          "workout-storage": {
            programs: workoutState.programs,
            exercises: workoutState.exercises,
            equipment: workoutState.equipment,
            muscleGroups: workoutState.muscleGroups,
          },
          "exercise-storage": {
            exercises: exerciseState.exercises,
          },
        },
        now,
      );

      await downloadBackupFile(
        contents,
        `activity-log-backup-${now.toISOString().slice(0, 10)}.json`,
      );
    } catch {
      Alert.alert(
        "Backup Failed",
        "Your app data could not be backed up. Please try again.",
      );
    } finally {
      setActiveAction(undefined);
    }
  };

  const applyBackup = (stores: ActivityLogBackupStores) => {
    const workoutState = useWorkoutStore.getState();
    const exerciseState = useExerciseStore.getState();
    const previousWorkoutData = {
      programs: workoutState.programs,
      exercises: workoutState.exercises,
      equipment: workoutState.equipment,
      muscleGroups: workoutState.muscleGroups,
    };
    const previousExerciseData = { exercises: exerciseState.exercises };

    try {
      exerciseState.replaceExerciseData(stores["exercise-storage"]);
      workoutState.replaceWorkoutData(stores["workout-storage"]);
    } catch {
      let rollbackSucceeded = true;

      try {
        workoutState.replaceWorkoutData(previousWorkoutData);
        exerciseState.replaceExerciseData(previousExerciseData);
      } catch {
        rollbackSucceeded = false;
      }

      Alert.alert(
        "Restore Failed",
        rollbackSucceeded
          ? "Your backup could not be restored. Your previous app data has been kept."
          : "Your backup could not be restored because app storage is unavailable. Close and reopen the app before making more changes.",
      );
      return;
    }

    const pendingSelection = usePendingSelection.getState();
    pendingSelection.clearPendingExercise();
    pendingSelection.clearPendingLoad();
    pendingSelection.clearPendingSession();
    router.back();
  };

  const restoreBackupData = async () => {
    setActiveAction("restore");

    try {
      const contents = await pickBackupFileContents();
      if (contents == null) return;

      const stores = parseActivityLogBackup(contents);

      Alert.alert(
        "Restore Backup Data?",
        "This will permanently delete and replace all current workout programs, sessions, exercises, equipment, and muscle settings with the data in this backup. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore Backup Data",
            style: "destructive",
            onPress: () => applyBackup(stores),
          },
        ],
      );
    } catch {
      Alert.alert(
        "Restore Failed",
        "The selected file is not a valid Activity Log backup. No app data was changed.",
      );
    } finally {
      setActiveAction(undefined);
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
            label="Backup Data"
            accessibilityLabel="Backup app data"
            accessibilityHint="Downloads a JSON backup containing all workout and exercise data."
            disabled={activeAction != null}
            onPress={() => void backupData()}
            stack={{ index: 0, size: 2 }}
          />
          <PrimaryCardAction
            label="Restore Backup Data"
            labelClassName="text-destructive"
            accessibilityLabel="Restore backup data"
            accessibilityHint="Opens the file picker to select an Activity Log JSON backup."
            disabled={activeAction != null}
            onPress={() => void restoreBackupData()}
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
