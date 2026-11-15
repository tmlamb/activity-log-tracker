import type { PropsWithChildren } from "react";
import { Fragment, useEffect, useState } from "react";
import { AppState, ScrollView } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { cleanupInactiveSessions } from "~/data/actions";
import { openDatabase } from "~/data/open-database";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { refresh, setDatabase, useGeneration } from "~/data/store";
import { captureException } from "~/utils/posthog";
import { PrimaryCardAction } from "./CardRow";
import { Text } from "./font-scale-text";
import { HelperText } from "./Typography";

const cleanupIntervalMs = 60_000;
let opened = false;

/** Open the database once per app process; returns the failure, if any. */
function ensureDatabase(): unknown {
  if (opened) return undefined;
  try {
    setDatabase(openDatabase());
    opened = true;
    cleanupInactiveSessions();
    return undefined;
  } catch (error) {
    captureException(error);
    return error ?? new Error("The workout database could not be opened.");
  }
}

function runCleanup() {
  try {
    cleanupInactiveSessions();
  } catch (error) {
    captureException(error);
  }
}

/** Finish abandoned sessions periodically and refresh clock-based data on resume. */
function useForegroundMaintenance() {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(interval);
      interval = setInterval(runCleanup, cleanupIntervalMs);
    };
    if (AppState.currentState === "active") start();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        runCleanup();
        refresh();
        start();
      } else clearInterval(interval);
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
}

function OpenDatabase({ children }: PropsWithChildren) {
  const generation = useGeneration();
  useForegroundMaintenance();
  useEffect(() => {
    useSelectionHandoff.getState().clearOtherGenerations(generation);
  }, [generation]);
  // Replacing the dataset remounts every screen so no stale form state survives.
  return <Fragment key={generation}>{children}</Fragment>;
}

export function ApplicationDataBootstrap({ children }: PropsWithChildren) {
  const [error, setError] = useState(ensureDatabase);
  useEffect(() => {
    void SplashScreen.hideAsync().catch(captureException);
  }, []);
  if (error === undefined) return <OpenDatabase>{children}</OpenDatabase>;
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
        onPress={() => setError(ensureDatabase())}
      />
    </ScrollView>
  );
}
