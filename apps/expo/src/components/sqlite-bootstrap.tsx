import type { InfiniteData } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { Alert, AppState, ScrollView } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import type {
  ProgramWeekPage,
  TimelineCursor,
} from "~/data/domain/program-timeline";
import type { ApplicationDataRuntime } from "~/data/react/application-data";
import { openNativeApplicationDataRuntime } from "~/data/native-runtime";
import { ApplicationDataProvider } from "~/data/react/application-data";
import { createRuntimeLeaseManager } from "~/data/runtime-leases";
import { downloadBackupFile } from "~/utils/backup-file";
import { captureException } from "~/utils/posthog";
import { PrimaryCardAction } from "./CardRow";
import { Text } from "./font-scale-text";
import { HelperText } from "./Typography";

const leases = createRuntimeLeaseManager(() =>
  openNativeApplicationDataRuntime(captureException),
);
const cleanupIntervalMs = 60_000;

function isClockSensitive(key: readonly unknown[], generation: number) {
  return (
    key[0] === "workout" &&
    key[1] === generation &&
    key[2] === "program" &&
    (key[4] === "timeline" ||
      key[4] === "insights" ||
      key[4] === "exercise-series")
  );
}

function ActiveRuntime({
  runtime,
  children,
}: PropsWithChildren<{ runtime: ApplicationDataRuntime }>) {
  useEffect(() => {
    let disposed = false;
    let active =
      AppState.currentState !== "background" &&
      AppState.currentState !== "inactive";
    let revision = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    let maintenanceRunning = false;
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = undefined;
    };
    const start = () => {
      stop();
      interval = setInterval(() => {
        if (maintenanceRunning) return;
        maintenanceRunning = true;
        void runtime
          .resume()
          .catch((error: unknown) => {
            captureException(error);
          })
          .finally(() => {
            maintenanceRunning = false;
          });
      }, cleanupIntervalMs);
    };
    const resume = async () => {
      const request = ++revision;
      try {
        await runtime.resume();
        const generation = runtime.getSnapshot().generation;
        const predicate = (query: { queryKey: readonly unknown[] }) =>
          isClockSensitive(query.queryKey, generation);
        await runtime.cache.cancelQueries({ predicate });
        runtime.cache
          .getQueryCache()
          .findAll({
            predicate: (query) =>
              predicate(query) &&
              query.queryKey[4] === "timeline" &&
              query.queryKey[5] === "week",
          })
          .forEach((query) => {
            const data = query.state.data as
              | InfiniteData<ProgramWeekPage, TimelineCursor | undefined>
              | undefined;
            if (data?.pages[0])
              runtime.cache.setQueryData(query.queryKey, {
                pages: [data.pages[0]],
                pageParams: [undefined],
              });
          });
        void runtime.cache
          .invalidateQueries({ predicate, refetchType: "active" })
          .catch(captureException);
        if (!disposed && active && request === revision) {
          start();
        }
      } catch (error) {
        captureException(error);
      }
    };
    if (active) start();
    const subscription = AppState.addEventListener("change", (next) => {
      active = next === "active";
      if (active) void resume();
      else {
        revision++;
        stop();
      }
    });
    return () => {
      disposed = true;
      revision++;
      stop();
      subscription.remove();
    };
  }, [runtime]);
  return (
    <ApplicationDataProvider runtime={runtime}>
      {children}
    </ApplicationDataProvider>
  );
}

export function SQLiteBootstrap({ children }: PropsWithChildren) {
  const [attempt, setAttempt] = useState(0);
  const [runtime, setRuntime] = useState<ApplicationDataRuntime>();
  const [error, setError] = useState<unknown>();
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    if (runtime || error !== undefined)
      void SplashScreen.hideAsync().catch(captureException);
  }, [runtime, error]);
  useEffect(() => {
    let mounted = true;
    const lease = leases.acquire();
    lease.runtime
      .then((opened) => {
        if (mounted) {
          setError(undefined);
          setRuntime(opened);
        }
      })
      .catch((failure: unknown) => {
        if (mounted) {
          captureException(failure);
          setError(
            failure ?? new Error("The workout database could not be opened."),
          );
        }
      });
    return () => {
      mounted = false;
      lease.release();
    };
  }, [attempt]);
  if (runtime)
    return <ActiveRuntime runtime={runtime}>{children}</ActiveRuntime>;
  if (error !== undefined)
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="grow justify-center gap-5 px-8 py-10"
      >
        <Text className="text-foreground text-center text-2xl font-semibold">
          Workout data needs attention
        </Text>
        <HelperText selectable>
          {error instanceof Error
            ? error.message
            : "The workout database could not be opened."}
        </HelperText>
        <PrimaryCardAction
          label="Try Again"
          accessibilityLabel="Retry opening workout data"
          disabled={exporting}
          onPress={() => {
            setError(undefined);
            setAttempt((value) => value + 1);
          }}
        />
        <PrimaryCardAction
          label={exporting ? "Preparing…" : "Export Recovery Data"}
          accessibilityLabel="Export recovery data"
          disabled={exporting}
          onPress={() => {
            setExporting(true);
            void import("~/data/legacy/native-recovery")
              .then(({ exportNativeRecoveryData }) =>
                exportNativeRecoveryData(),
              )
              .then((contents) =>
                downloadBackupFile(contents, "activity-log-recovery.json"),
              )
              .catch(() =>
                Alert.alert(
                  "Export Failed",
                  "Recovery data could not be exported. Please try again.",
                ),
              )
              .finally(() => setExporting(false));
          }}
        />
      </ScrollView>
    );
  return null;
}
