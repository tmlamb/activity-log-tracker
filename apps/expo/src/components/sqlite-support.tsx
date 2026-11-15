import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Updates from "expo-updates";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import { prepareApplicationRestore } from "~/data/backup/prepare-restore";
import { useApplicationDataSnapshot } from "~/data/react/application-data";
import {
  downloadBackupFile,
  pickBackupFileContents,
} from "~/utils/backup-file";
import { version as appVersion } from "../../package.json";
import { PrimaryCardAction } from "./CardRow";
import ConfirmButton from "./ConfirmButton";
import { HeaderTextAction } from "./HeaderAction";
import { HelperText } from "./Typography";

export function SQLiteSupport({
  runtime,
}: {
  runtime: ApplicationDataRuntime;
}) {
  const router = useRouter();
  const snapshot = useApplicationDataSnapshot(runtime);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = () =>
    mounted.current && runtime.getSnapshot().generation === snapshot.generation;
  const run = async (job: () => Promise<void>, failure: string) => {
    if (busy.current || !current()) return;
    busy.current = true;
    setPending(true);
    try {
      await job();
    } catch {
      if (current()) Alert.alert("Support Action Failed", failure);
    } finally {
      busy.current = false;
      if (current()) setPending(false);
    }
  };
  const backup = () =>
    run(async () => {
      const now = new Date();
      const contents = await snapshot.service.exportBackupV2();
      await downloadBackupFile(
        contents,
        `activity-log-backup-${now.toISOString().slice(0, 10)}.json`,
      );
    }, "Your app data could not be backed up. Please try again.");
  const restore = () =>
    run(async () => {
      const contents = await pickBackupFileContents();
      if (contents === null || !current()) return;
      const prepared = prepareApplicationRestore(contents);
      Alert.alert(
        "Restore Backup Data?",
        "This will permanently delete and replace all current workout programs, sessions, exercises, equipment, and muscle settings with the data in this backup. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore Backup Data",
            style: "destructive",
            onPress: () =>
              void run(async () => {
                await runtime.restore(prepared);
                router.back();
              }, "Your backup could not be restored. Your previous app data has been kept."),
          },
        ],
      );
    }, "The selected backup could not be opened or is invalid. No app data was changed.");
  const reset = () =>
    run(async () => {
      await runtime.reset();
      router.back();
    }, "Your app data could not be reset. Please try again.");
  const report = () =>
    run(async () => {
      const saved = await snapshot.service.conversionReport();
      if (!current()) return;
      if (!saved) {
        Alert.alert(
          "Conversion Report",
          "No retained conversion report is available.",
        );
        return;
      }
      const details = JSON.parse(saved.report) as {
        repairs?: unknown[];
        identities?: {
          reason?: string;
          pointer?: string;
          original?: unknown;
        }[];
      };
      const created =
        details.identities?.filter(
          (item) =>
            item.pointer?.startsWith("/presets/") &&
            item.original == null &&
            item.reason === "invalid",
        ).length ?? 0;
      const remapped =
        details.identities?.filter(
          (item) =>
            item.reason !== "unchanged" &&
            !(
              item.pointer?.startsWith("/presets/") &&
              item.original == null &&
              item.reason === "invalid"
            ),
        ).length ?? 0;
      Alert.alert(
        "Conversion Report",
        `Repairs: ${details.repairs?.length ?? 0}\nRemapped IDs: ${remapped}\nPreset IDs created: ${created}`,
        [
          { text: "Done", style: "cancel" },
          {
            text: "Export Report",
            onPress: () =>
              void run(async () => {
                await downloadBackupFile(
                  saved.report,
                  "activity-log-conversion-report.json",
                );
              }, "The report could not be exported."),
          },
        ],
      );
    }, "The conversion report could not be loaded.");
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
      <Stack.Screen
        options={{
          headerLeft: () => (
            <HeaderTextAction
              label="Done"
              disabled={pending}
              onPress={() => router.back()}
              accessibilityLabel="Close Support"
              color="foreground"
            />
          ),
        }}
      />
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
          {__DEV__ && (
            <PrimaryCardAction
              label="Conversion Report"
              accessibilityLabel="View conversion report"
              onPress={() => void report()}
            />
          )}
          <ConfirmButton
            accessibilityLabel="Reset all app data"
            title="Reset App Data?"
            message="This will permanently delete all workout programs, sessions, exercises, and equipment settings. Equipment will be restored to the default barbell and plate inventory."
            confirmText="Reset App Data"
            onConfirm={() => void reset()}
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
    </>
  );
}
