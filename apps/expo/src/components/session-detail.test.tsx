import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { SessionActivity } from "~/data/repositories/session-detail";
import SessionDetailScreen from "~/app/(public)/(app)/program/[programId]/session/[sessionId]/index";

const env = vi.hoisted(() => ({
  focused: true,
  listeners: new Set<() => void>(),
  renderList: vi.fn(),
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
      activities: [] as unknown[],
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
    useNavigation: () => ({ addListener: () => () => undefined }),
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
  Link: ({ children, href }: PropsWithChildren<{ href: string }>) => (
    <div data-href={href}>{children}</div>
  ),
  Redirect: () => <div>Redirect</div>,
  Stack: {
    Screen: () => null,
    Toolbar: Object.assign(() => null, { Button: () => null }),
  },
  useLocalSearchParams: () => ({ programId: "p", sessionId: "s" }),
  useRouter: () => ({ dismissTo: vi.fn() }),
}));
vi.mock("~/data/actions", () => ({
  completeSession: vi.fn(),
  setSessionDeload: vi.fn(),
}));
vi.mock("~/data/queries", async () => {
  const { useIsFocused } = await import("expo-router/react-navigation");
  return {
    useSessionEditorSeed: () => {
      useIsFocused();
      return env.seed;
    },
    useSessionDeloadCandidate: () => {
      useIsFocused();
      return null;
    },
  };
});
vi.mock("./BottomActionBar", () => ({ default: () => null }));
vi.mock("./Card", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./CardRow", () => ({
  DetailCardRow: ({ value }: { value: ReactNode }) => <div>{value}</div>,
  NavigationCardRow: ({
    title,
    subtitle,
  }: {
    title: ReactNode;
    subtitle?: ReactNode;
  }) => (
    <div data-subtitle={subtitle}>
      {title}
      {subtitle}
    </div>
  ),
}));
vi.mock("./CollapsibleSection", () => {
  // Like LegendList, rows are rendered from `data`; a screen re-render alone
  // does not re-render existing rows, but a row's own state change does.
  const rowsByData = new WeakMap<readonly unknown[], ReactNode[]>();
  return {
    CollapsibleSection: ({
      title,
      titleParts,
      collapsed,
      onCollapsedChange,
      children,
    }: PropsWithChildren<{
      title: string;
      titleParts?: string[];
      collapsed: boolean;
      onCollapsedChange: (next: boolean) => void;
    }>) => (
      <section>
        <button
          data-title={title}
          data-title-parts={titleParts}
          data-collapsed={collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
        />
        {!collapsed && children}
      </section>
    ),
    CollapsibleSectionList: ({
      ListHeaderComponent,
      data,
      keyExtractor,
      renderItem,
    }: {
      ListHeaderComponent: ReactNode;
      data: readonly { id: string }[];
      keyExtractor: (item: { id: string }) => string;
      renderItem: (info: { item: { id: string }; index: number }) => ReactNode;
    }) => {
      env.renderList();
      let rows = rowsByData.get(data);
      if (!rows) {
        rows = data.map((item, index) => (
          <div key={keyExtractor(item)}>{renderItem({ item, index })}</div>
        ));
        rowsByData.set(data, rows);
      }
      return (
        <main>
          {ListHeaderComponent}
          {rows}
        </main>
      );
    },
  };
});
vi.mock("./ElapsedTime", () => ({ default: () => null }));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
  headerIcons: { insights: "chart.bar.xaxis.ascending", plus: "plus" },
}));
vi.mock("./PressableThemed", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
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
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionDetailScreen />);
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
      renderer?.update(<SessionDetailScreen />);
      await Promise.resolve();
    });
    expect(env.renderList).toHaveBeenCalledTimes(initialRenders + 1);
    expect(JSON.stringify(renderer?.toJSON())).toContain("Updated Session");
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("doesn't redirect from under the edit modal when the session is deleted", async () => {
    const seed = env.seed;
    env.seed = { ...seed, session: null as unknown as typeof seed.session };
    env.focused = false;
    let renderer: ReturnType<typeof create> | undefined;
    try {
      await act(async () => {
        renderer = create(<SessionDetailScreen />);
        await Promise.resolve();
      });
      expect(renderer?.toJSON()).toBeNull();
      await act(async () => {
        env.focused = true;
        env.listeners.forEach((listener) => listener());
        await Promise.resolve();
      });
      expect(JSON.stringify(renderer?.toJSON())).toContain("Redirect");
      await act(async () => {
        renderer?.unmount();
        await Promise.resolve();
      });
    } finally {
      env.seed = seed;
      env.focused = true;
    }
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
    let renderer: ReturnType<typeof create> | undefined;
    try {
      await act(async () => {
        renderer = create(<SessionDetailScreen />);
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

describe("session detail exercises", () => {
  const set = (
    id: string,
    done: boolean,
    kind: "Warmup" | "Main" = "Main",
    position = 0,
  ) => ({
    id,
    kind,
    position,
    status: done ? ("Done" as const) : ("Planned" as const),
    feedback: "Neutral" as const,
    actualReps: done ? 5 : null,
    weightValue: null,
    weightUnit: null,
    startMs: null,
    endMs: null,
  });
  type Row = Omit<SessionActivity, "supersets">;
  const activity = (id: string, done: boolean): Row & { supersets: Row[] } => ({
    id,
    exerciseId: id,
    exerciseName: `Exercise ${id}`,
    exerciseDeleted: false,
    reps: 5,
    loadType: null,
    loadValue: null,
    restMinutes: null,
    warmupSets: [],
    mainSets: [set(`${id}-set`, done)],
    alternatives: [],
    supersets: [],
  });

  it("toggles each exercise repeatedly and collapses one when its sets are completed", async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    env.focused = true;
    env.seed = {
      ...env.seed,
      session: {
        ...env.seed.session,
        lastActivityAtMs: null,
        activities: [activity("done", true), activity("open", false)],
      },
    };
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionDetailScreen />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    const header = (title: string) =>
      root.findByProps({ "data-title": title }).props as {
        "data-collapsed": boolean;
        onClick: () => void;
      };
    const press = (title: string) =>
      act(() => {
        header(title).onClick();
      });

    // Sets outside a superset have no exercise subtitle.
    expect(
      root.findAll((node) => node.props["data-subtitle"] !== undefined),
    ).toHaveLength(0);
    // Every exercise starts collapsed, finished or not.
    expect(header("Exercise done")["data-collapsed"]).toBe(true);
    expect(header("Exercise open")["data-collapsed"]).toBe(true);
    for (const expected of [false, true, false, true]) {
      press("Exercise done");
      expect(header("Exercise done")["data-collapsed"]).toBe(expected);
    }
    // Leave the unfinished exercise open to see it collapse on completion.
    for (const expected of [false, true, false]) {
      press("Exercise open");
      expect(header("Exercise open")["data-collapsed"]).toBe(expected);
    }

    // Completing the last set collapses the exercise automatically.
    env.seed = {
      ...env.seed,
      session: {
        ...env.seed.session,
        activities: [activity("done", true), activity("open", true)],
      },
    };
    await act(async () => {
      renderer?.update(<SessionDetailScreen />);
      await Promise.resolve();
    });
    expect(header("Exercise open")["data-collapsed"]).toBe(true);
    press("Exercise open");
    expect(header("Exercise open")["data-collapsed"]).toBe(false);
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("lists a superset's exercises in its header and alternates their sets", async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    env.focused = true;
    const sets = (id: string) => ({
      warmupSets: [0, 1].map((index) =>
        set(`${id}-w${index}`, false, "Warmup", index),
      ),
      mainSets: [0, 1].map((index) =>
        set(`${id}-m${index}`, false, "Main", index),
      ),
    });
    const { supersets: _none, ...member } = activity("b", false);
    env.seed = {
      ...env.seed,
      session: {
        ...env.seed.session,
        lastActivityAtMs: null,
        activities: [
          {
            ...activity("a", false),
            ...sets("a"),
            supersets: [
              { ...member, ...sets("b") },
              { ...member, id: "c", exerciseName: "Exercise c", ...sets("c") },
            ],
          },
        ],
      },
    };
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionDetailScreen />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    expect(
      root
        .findAllByType("button")
        .map((node) => [
          node.props["data-title"] as string,
          node.props["data-title-parts"] as string[],
        ]),
    ).toEqual([
      [
        "Exercise a, Exercise b, Exercise c",
        ["Exercise a", "Exercise b", "Exercise c"],
      ],
    ]);
    // The superset starts collapsed; open it to see its sets.
    await act(async () => {
      (
        root.findAllByType("button")[0]?.props as { onClick: () => void }
      ).onClick();
      await Promise.resolve();
    });
    const links = root
      .findAll((node) => typeof node.props["data-href"] === "string")
      .map((node) => {
        const href = new URL(String(node.props["data-href"]), "https://x");
        return [
          href.searchParams.get("title"),
          href.searchParams.get("activityId"),
          href.searchParams.get("workoutSetId"),
        ];
      });
    expect(links).toEqual([
      ["Warmup Set 1", "a", "a-w0"],
      ["Warmup Set 1", "b", "b-w0"],
      ["Warmup Set 1", "c", "c-w0"],
      ["Warmup Set 2", "a", "a-w1"],
      ["Warmup Set 2", "b", "b-w1"],
      ["Warmup Set 2", "c", "c-w1"],
      ["Superset 1", "a", "a-m0"],
      ["Superset 1", "b", "b-m0"],
      ["Superset 1", "c", "c-m0"],
      ["Superset 2", "a", "a-m1"],
      ["Superset 2", "b", "b-m1"],
      ["Superset 2", "c", "c-m1"],
    ]);
    // Each superset set names its exercise under the set number.
    expect(
      root
        .findAll((node) => node.props["data-subtitle"] !== undefined)
        .map((node) => node.props["data-subtitle"] as string),
    ).toEqual(
      Array.from({ length: 4 }, () => [
        "Exercise a",
        "Exercise b",
        "Exercise c",
      ]).flat(),
    );
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });
});
