import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import { SQLiteSessionDetail } from "./sqlite-session-detail";

const env = vi.hoisted(() => ({
  focused: true,
  listeners: new Set<() => void>(),
  renderList: vi.fn(),
  snapshot: { generation: 1 },
  seed: {
    session: {
      id: "s",
      programId: "p",
      name: "Session",
      status: "Ready",
      deload: false,
      startMs: null,
      endMs: null,
      lastActivityAtMs: null as number | null,
      activities: [],
    },
    policy: { canSetDeload: false, isLatestCompletedInLineage: false },
  },
}));

vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: ({ children }: PropsWithChildren) => <div>{children}</div> },
  LinearTransition: { duration: () => ({}) },
}));
vi.mock("expo-router/react-navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useIsFocused: () =>
      useSyncExternalStore(
        (listener) => {
          env.listeners.add(listener);
          return () => {
            env.listeners.delete(listener);
          };
        },
        () => env.focused,
      ),
  };
});
vi.mock("expo-router", () => ({
  Link: ({ children }: PropsWithChildren) => <>{children}</>,
  Redirect: () => <div>Redirect</div>,
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ programId: "p", sessionId: "s" }),
  useRouter: () => ({ dismissTo: vi.fn() }),
}));
vi.mock("~/data/react/application-data", () => ({
  useApplicationDataSnapshot: () => env.snapshot,
}));
vi.mock("~/data/react/session-queries", async () => {
  const { useIsFocused } = await import("expo-router/react-navigation");
  return {
    useSessionEditorSeed: () => {
      useIsFocused();
      return { data: env.seed };
    },
    useSessionDeloadCandidate: () => {
      useIsFocused();
      return { data: undefined };
    },
  };
});
vi.mock("./BottomActionBar", () => ({ default: () => null }));
vi.mock("./Card", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./CardRow", () => ({
  DetailCardRow: ({ value }: { value: ReactNode }) => <div>{value}</div>,
  NavigationCardRow: ({ title }: { title: ReactNode }) => <div>{title}</div>,
}));
vi.mock("./CollapsibleSection", () => ({
  CollapsibleSection: ({ children }: PropsWithChildren) => (
    <section>{children}</section>
  ),
  CollapsibleSectionList: ({
    ListHeaderComponent,
  }: {
    ListHeaderComponent: ReactNode;
  }) => {
    env.renderList();
    return <main>{ListHeaderComponent}</main>;
  },
}));
vi.mock("./ElapsedTime", () => ({ default: () => null }));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./HeaderAction", () => ({ HeaderTextAction: () => null }));
vi.mock("./PressableThemed", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./sqlite-query-status", () => ({ SQLiteQueryStatus: () => null }));
vi.mock("./SwitchThemed", () => ({ default: () => null }));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
  ScreenHeading: ({ children }: PropsWithChildren) => <h1>{children}</h1>,
}));

describe("session detail navigation", () => {
  it("does not rerender the exercise list when navigation changes focus, but still renders new session data", async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    env.focused = true;
    env.renderList.mockClear();
    const runtime = {
      getSnapshot: () => env.snapshot,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SQLiteSessionDetail runtime={runtime} />);
      await Promise.resolve();
    });
    const initialRenders = env.renderList.mock.calls.length;
    expect(initialRenders).toBeGreaterThan(0);
    await act(async () => {
      env.focused = false;
      env.listeners.forEach((listener) => listener());
      await Promise.resolve();
    });
    expect(env.renderList).toHaveBeenCalledTimes(initialRenders);
    env.seed = {
      ...env.seed,
      session: { ...env.seed.session, name: "Updated Session" },
    };
    await act(async () => {
      renderer?.update(<SQLiteSessionDetail runtime={runtime} />);
      await Promise.resolve();
    });
    expect(env.renderList).toHaveBeenCalledTimes(initialRenders + 1);
    expect(JSON.stringify(renderer?.toJSON())).toContain("Updated Session");
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("still shows the inactivity warning at the existing threshold", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000_000);
    env.focused = true;
    env.seed = {
      ...env.seed,
      session: {
        ...env.seed.session,
        status: "Ready",
        lastActivityAtMs: 10_000_000 - 30 * 60 * 1000 + 1000,
      },
    };
    const runtime = {
      getSnapshot: () => env.snapshot,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    try {
      await act(async () => {
        renderer = create(<SQLiteSessionDetail runtime={runtime} />);
        await Promise.resolve();
      });
      expect(JSON.stringify(renderer?.toJSON())).not.toContain(
        "Sessions left open",
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(JSON.stringify(renderer?.toJSON())).toContain(
        "Sessions left open without activity",
      );
      await act(async () => {
        renderer?.unmount();
        await Promise.resolve();
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
