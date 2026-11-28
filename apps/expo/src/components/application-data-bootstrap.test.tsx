import type { PropsWithChildren } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { captureException } from "~/utils/posthog";
import { ApplicationDataBootstrap } from "./application-data-bootstrap";

const env = vi.hoisted(() => ({
  change: undefined as ((state: string) => void) | undefined,
  failure: undefined as Error | undefined,
  database: { name: "database" },
  optimize: vi.fn(),
  cleanup: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("react-native", () => ({
  ScrollView: ({ children }: PropsWithChildren) => <div>{children}</div>,
  AppState: {
    currentState: "active",
    addEventListener: (_event: string, listener: (state: string) => void) => {
      env.change = listener;
      return { remove: vi.fn() };
    },
  },
}));
vi.mock("expo-splash-screen", () => ({
  hideAsync: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/utils/posthog", () => ({ captureException: vi.fn() }));
vi.mock("~/data/open-database", () => ({
  openDatabase: () => {
    if (env.failure) throw env.failure;
    return env.database;
  },
  optimizeDatabase: env.optimize,
}));
vi.mock("~/data/actions", () => ({ cleanupInactiveSessions: env.cleanup }));
vi.mock("~/data/store", () => ({
  setDatabase: vi.fn(),
  refresh: env.refresh,
  useGeneration: () => 1,
}));
vi.mock("./CardRow", () => ({
  PrimaryCardAction: ({ onPress }: { onPress: () => void }) => (
    <button onClick={onPress}>Try Again</button>
  ),
}));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("application data bootstrap", () => {
  it("shows the failure and opens the database on retry", () => {
    env.failure = new Error("Migration failed: disk full");
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(
        <ApplicationDataBootstrap>
          <p>Existing screen</p>
        </ApplicationDataBootstrap>,
      );
    });
    expect(JSON.stringify(renderer?.toJSON())).toContain(
      "Migration failed: disk full",
    );

    env.failure = undefined;
    // Statistics are optional: a failed optimize is reported, not shown.
    const optimizeFailure = new Error("database is locked");
    env.optimize.mockImplementationOnce(() => {
      throw optimizeFailure;
    });
    act(() => {
      (
        renderer?.root.findByType("button").props as { onClick: () => void }
      ).onClick();
    });
    expect(JSON.stringify(renderer?.toJSON())).toContain("Existing screen");
    expect(env.optimize).toHaveBeenCalledExactlyOnceWith(env.database);
    expect(captureException).toHaveBeenCalledWith(optimizeFailure);
    expect(env.cleanup).toHaveBeenCalledOnce();

    act(() => env.change?.("background"));
    act(() => env.change?.("active"));
    expect(env.cleanup).toHaveBeenCalledTimes(2);
    expect(env.refresh).toHaveBeenCalledOnce();
    act(() => renderer?.unmount());
  });
});
