import type { PropsWithChildren } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { ApplicationDataBootstrap } from "./application-data-bootstrap";

const env = vi.hoisted(() => ({
  change: undefined as ((state: string) => void) | undefined,
  resume: vi.fn(),
  release: vi.fn(),
  failure: undefined as Error | undefined,
}));

vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
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
vi.mock("~/data/native-runtime", () => ({
  openNativeApplicationDataRuntime: vi.fn(),
}));
vi.mock("~/data/react/application-data", () => ({
  ApplicationDataProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock("~/data/runtime-leases", () => ({
  createRuntimeLeaseManager: () => ({
    acquire: () => ({
      runtime: env.failure
        ? Promise.reject(env.failure)
        : Promise.resolve({
            resume: env.resume,
            getSnapshot: () => ({ generation: 1 }),
            cache: {
              cancelQueries: vi.fn().mockResolvedValue(undefined),
              invalidateQueries: vi.fn().mockResolvedValue(undefined),
              getQueryCache: () => ({ findAll: () => [] }),
            },
          }),
      release: env.release,
    }),
  }),
}));
vi.mock("./CardRow", () => ({ PrimaryCardAction: () => null }));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));

describe("application data bootstrap", () => {
  it("keeps the existing screen visible and interactive while resume maintenance is pending", async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    let finish: (() => void) | undefined;
    env.resume.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(
        <ApplicationDataBootstrap>
          <button>Existing screen</button>
        </ApplicationDataBootstrap>,
      );
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    await act(async () => {
      env.change?.("background");
      env.change?.("active");
      await Promise.resolve();
    });
    expect(env.resume).toHaveBeenCalledOnce();
    expect(renderer.root.findByType("button").children).toContain(
      "Existing screen",
    );
    expect(JSON.stringify(renderer.toJSON())).not.toContain(
      "Refreshing workout data",
    );
    await act(async () => {
      finish?.();
      await Promise.resolve();
      renderer?.unmount();
    });
  });

  it("shows migration error details", async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    env.failure = new Error("Could not read legacy workout data");
    let renderer: ReturnType<typeof create> | undefined;
    try {
      await act(async () => {
        renderer = create(
          <ApplicationDataBootstrap>
            <span>App</span>
          </ApplicationDataBootstrap>,
        );
        await Promise.resolve();
      });
      expect(JSON.stringify(renderer?.toJSON())).toContain(
        "Could not read legacy workout data",
      );
    } finally {
      await act(() => renderer?.unmount());
      env.failure = undefined;
    }
  });
});
