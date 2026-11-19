import { useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import * as Updates from "expo-updates";

import BusyOverlay, { afterNextPaint } from "~/components/BusyOverlay";
import { PrimaryCardAction } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import { useHeaderButtonProps } from "~/components/header-toolbar";
import { HelperText } from "~/components/Typography";
import {
  exportBackup,
  resetApplicationData,
  restoreApplicationData,
} from "~/data/actions";
import { prepareApplicationRestore } from "~/data/backup/prepare-restore";
import useRouter from "~/hooks/use-router";
import {
  downloadBackupFile,
  pickBackupFileContents,
} from "~/utils/backup-file";
import { version as appVersion } from "../../../../../package.json";

export default function SupportScreen() {
  const router = useRouter();
  const headerButton = useHeaderButtonProps();
  // Sharing and picking a file are still asynchronous.
  const [pending, setPending] = useState(false);
  // Shown while large backups are validated or restored synchronously.
  const [progress, setProgress] = useState<string | null>(null);
  const busy = useRef(false);
  const runFileAction = async (job: () => Promise<void>, failure: string) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      await job();
    } catch {
      Alert.alert("Support Action Failed", failure);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const backup = () =>
    runFileAction(async () => {
      const now = new Date();
      await downloadBackupFile(
        exportBackup(),
        `activity-log-backup-${now.toISOString().slice(0, 10)}.json`,
      );
    }, "Your app data could not be backed up. Please try again.");
  const confirmRestore = (contents: string) => {
    const prepared = prepareApplicationRestore(contents);
    Alert.alert(
      "Restore Backup Data?",
      "This will permanently delete and replace all current workout programs, sessions, exercises, equipment, and muscle settings with the data in this backup. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore Backup Data",
          style: "destructive",
          onPress: () => void applyRestore(prepared),
        },
      ],
    );
  };
  const applyRestore = async (
    prepared: ReturnType<typeof prepareApplicationRestore>,
  ) => {
    setProgress("Restoring backup…");
    await afterNextPaint();
    try {
      restoreApplicationData(prepared);
    } catch {
      setProgress(null);
      Alert.alert(
        "Support Action Failed",
        "Your backup could not be restored. Your previous app data has been kept.",
      );
      return;
    }
    // A restore remounts every screen, which also clears the overlay.
    router.back();
  };
  const restore = () =>
    runFileAction(async () => {
      const contents = await pickBackupFileContents();
      if (contents === null) return;
      setProgress("Checking backup…");
      await afterNextPaint();
      try {
        confirmRestore(contents);
      } finally {
        setProgress(null);
      }
    }, "The selected backup could not be opened or is invalid. No app data was changed.");
  const reset = () => {
    try {
      resetApplicationData();
    } catch {
      Alert.alert(
        "Support Action Failed",
        "Your app data could not be reset. Please try again.",
      );
      return;
    }
    router.back();
  };
  const updateIdentifier = __DEV__
    ? "dev"
    : (Updates.updateId?.slice(-4) ??
      (Updates.isEnabled
        ? Updates.isEmbeddedLaunch
          ? "embedded"
          : "unknown"
        : "unavailable"));
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          {...headerButton("foreground")}
          disabled={pending || progress !== null}
          accessibilityLabel="Close Support"
          onPress={() => router.back()}
        >
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ScrollView
        className="flex-1"
        contentContainerClassName="grow px-5 pt-5 gap-6 justify-between pb-18"
        contentInsetAdjustmentBehavior="automatic"
        pointerEvents={pending ? "none" : "auto"}
      >
        <View className="gap-6">
          <View>
            <PrimaryCardAction
              label="Backup Data"
              accessibilityLabel="Backup app data"
              accessibilityHint="Creates a JSON backup containing all workout and exercise data, then opens sharing options."
              onPress={() => void backup()}
              stack={{ index: 0, size: 2 }}
            />
            <PrimaryCardAction
              label="Restore Backup Data"
              labelClassName="text-destructive"
              cardVariants={["multiline"]}
              accessibilityLabel="Restore backup data"
              accessibilityHint="Opens the file picker to select an Activity Log JSON backup."
              onPress={() => void restore()}
              stack={{ index: 1, size: 2 }}
            />
          </View>
          <ConfirmButton
            accessibilityLabel="Reset all app data"
            title="Reset App Data?"
            message="This will permanently delete all workout programs, sessions, exercises, and equipment settings. Equipment will be restored to the default barbell and plate inventory."
            confirmText="Reset App Data"
            onConfirm={reset}
          >
            Reset App Data
          </ConfirmButton>
        </View>
        <View className="items-center gap-1">
          <HelperText placement="blockStart" className="text-center" selectable>
            v{appVersion}+{updateIdentifier}
          </HelperText>
        </View>
      </ScrollView>
      <BusyOverlay message={progress} />
    </>
  );
}
