import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import WorkoutSetDetailScreen from "~/app/(public)/(app)/program/[programId]/session/[sessionId]/set/index";
import { createWorkoutQueryClient } from "~/data/cache/query-client";
import { ApplicationDataProvider } from "~/data/react/application-data";

const cache = createWorkoutQueryClient();
function SetScreen({ runtime }: { runtime: ApplicationDataRuntime }) {
  return (
    <ApplicationDataProvider runtime={{ ...runtime, cache }}>
      <WorkoutSetDetailScreen />
    </ApplicationDataProvider>
  );
}

const env = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  alert: vi.fn(),
  dispatch: vi.fn(),
  input: "8",
  beforeRemove: null as null | ((event: { data: { action: unknown } }) => void),
  kind: "Main",
}));
vi.mock("react-native", () => ({
  Alert: { alert: env.alert },
  Keyboard: { dismiss: vi.fn(), addListener: () => ({ remove: vi.fn() }) },
  Platform: { OS: "ios" },
  TextInput: {
    State: { blurTextInput: vi.fn(), currentlyFocusedInput: vi.fn() },
  },
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("react-native-css", () => ({ useNativeVariable: () => "blue" }));
vi.mock("react-native-keyboard-controller", () => ({
  KeyboardAwareScrollView: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
  KeyboardStickyView: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
  KeyboardExtender: ({ children }: PropsWithChildren) => <div>{children}</div>,
  useKeyboardState: (selector: (state: { isVisible: boolean }) => unknown) =>
    selector({ isVisible: false }),
}));
vi.mock("react-native-reanimated", () => {
  const transition = {
    duration: () => transition,
    springify: () => transition,
    stiffness: () => transition,
    damping: () => transition,
    mass: () => transition,
  };
  return {
    default: {
      View: ({ children }: PropsWithChildren) => <div>{children}</div>,
    },
    LinearTransition: transition,
    FadeInUp: transition,
    FadeOutDown: transition,
  };
});
vi.mock("@expo/ui", () => ({
  Host: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Button: () => null,
}));
vi.mock("@expo/ui/swift-ui/modifiers", () => ({
  accessibilityLabel: vi.fn(),
  buttonBorderShape: vi.fn(),
  buttonStyle: vi.fn(),
  controlSize: vi.fn(),
  font: vi.fn(),
}));
vi.mock("./Styled", () => ({
  AnimatedViewStyled: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
}));
vi.mock("./PressableThemed", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({ dispatch: env.dispatch }),
  usePreventRemove: (
    _enabled: boolean,
    callback: (event: { data: { action: unknown } }) => void,
  ) => {
    env.beforeRemove = callback;
  },
}));
vi.mock("expo-router", () => {
  const Toolbar = Object.assign(
    ({ children }: PropsWithChildren) => <>{children}</>,
    {
      View: ({ children }: PropsWithChildren) => <>{children}</>,
      Button: ({
        accessibilityLabel,
        onPress,
      }: {
        accessibilityLabel: string;
        onPress: () => void;
      }) => <button data-label={accessibilityLabel} onClick={onPress} />,
    },
  );
  return {
    Redirect: () => null,
    Stack: {
      Screen: () => null,
      Toolbar,
    },
    useLocalSearchParams: () => ({
      programId: "p",
      sessionId: "s",
      activityId: "a",
      workoutSetId: "set",
    }),
    useRouter: () => ({
      back: env.back,
      push: env.push,
      canGoBack: () => true,
    }),
  };
});
vi.mock("@expo/vector-icons/MaterialCommunityIcons", () => ({
  default: () => null,
}));
vi.mock("~/data/react/session-queries", () => ({
  useSetContext: () => ({
    data: {
      reference: {
        programId: "p",
        sessionId: "s",
        activityId: "a",
        setId: "set",
      },
      session: {
        id: "s",
        programId: "p",
        name: "S",
        lineageId: null,
        status: "Ready",
        deload: false,
        startMs: 1,
        endMs: null,
        lastActivityAtMs: 1,
        revision: 0,
      },
      activity: {
        id: "a",
        exerciseId: "e",
        reps: 10,
        loadType: "RPE",
        loadValue: 8,
        restMinutes: 2,
        warmupSetCount: 0,
        mainSetCount: 1,
      },
      exercise: {
        id: "e",
        name: "Exercise",
        deleted: false,
        revision: 0,
        loadKind: "SINGLE_WEIGHT",
        barbellId: null,
        oneRepMax: null,
      },
      set: {
        id: "set",
        kind: env.kind,
        position: 0,
        status: "Ready",
        feedback: "Neutral",
        actualReps: 0,
        weightValue: 40,
        weightUnit: "kg",
        startMs: 1,
        endMs: null,
      },
      firstMainSet:
        env.kind === "Warmup"
          ? {
              id: "main",
              status: "Planned",
              weightValue: 100,
              weightUnit: "lbs",
            }
          : null,
      targetWeight: { value: 40, unit: "kg" },
      mainTargetWeight: null,
      hasTemplateHistory: false,
      isStartable: false,
      canComplete: false,
    },
  }),
}));
vi.mock("~/data/react/settings-queries", () => ({
  useExerciseDetail: () => ({
    data: { id: "e", name: "Exercise", notes: null },
  }),
  useEquipment: () => ({ data: { barbells: [], plates: [] } }),
}));
vi.mock("./BottomActionBar", () => ({
  default: ({
    label,
    hidden,
    onPress,
  }: {
    label: string;
    hidden: boolean;
    onPress: () => void;
  }) =>
    hidden ? null : (
      <button data-label={label} onClick={onPress}>
        {label}
      </button>
    ),
}));
vi.mock("./CardRow", () => ({
  DetailCardRow: ({
    label,
    value,
    stack,
  }: {
    label: ReactNode;
    value: ReactNode;
    stack?: { index: number; size: number };
  }) => (
    <div
      data-card-label={label}
      data-stack={stack ? `${stack.index}/${stack.size}` : "single"}
    >
      {label}
      {value}
    </div>
  ),
}));
vi.mock("./DumbbellChart", () => ({ default: () => null }));
vi.mock("./ElapsedTime", () => ({
  default: ({ stack }: { stack?: { index: number; size: number } }) => (
    <div
      data-elapsed-stack={stack ? `${stack.index}/${stack.size}` : "single"}
    />
  ),
}));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./HeaderAction", () => ({
  HeaderIconAction: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./MultilineTextInputThemed", () => ({ default: () => null }));
vi.mock("./PlateChart", () => ({ default: () => null }));
vi.mock("./SegmentedInputThemed", () => ({ default: () => null }));
vi.mock("./SingleWeightChart", () => ({ default: () => null }));
vi.mock("./TextInputThemed", () => ({
  default: ({
    label,
    value,
    onChangeText,
    stack,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    stack?: { index: number; size: number };
  }) => (
    <input
      data-label={label}
      data-stack={stack ? `${stack.index}/${stack.size}` : "single"}
      value={value}
      onChange={() => onChangeText(env.input)}
    />
  ),
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
}));

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  env.back.mockClear();
  env.push.mockClear();
  env.alert.mockClear();
  env.dispatch.mockClear();
  env.beforeRemove = null;
  env.input = "8";
  env.kind = "Main";
});

describe("set screen interactions", () => {
  it("keeps warmup targets and recording inputs in the original card groups", async () => {
    env.kind = "Warmup";
    const service = { patchSet: vi.fn(), setExerciseNotes: vi.fn() };
    const snapshot = { generation: 1, service };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SetScreen runtime={runtime} />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    expect(
      root.findByProps({ "data-card-label": "Exercise" }).props["data-stack"],
    ).toBe("0/3");
    expect(
      root.findByProps({ "data-card-label": "Target Load (Main)" }).props[
        "data-stack"
      ],
    ).toBe("1/3");
    expect(
      root.findByProps({ "data-card-label": "Target Reps (Main)" }).props[
        "data-stack"
      ],
    ).toBe("2/3");
    expect(
      root.findAllByProps({ "data-card-label": "Target Rest" }),
    ).toHaveLength(0);
    expect(
      root.findByProps({ "data-label": "Weight (kg)" }).props["data-stack"],
    ).toBe("0/3");
    expect(
      root.findByProps({ "data-label": "Actual Reps" }).props["data-stack"],
    ).toBe("1/3");
    expect(root.findByProps({ "data-elapsed-stack": "2/3" })).toBeDefined();
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("flushes recorded reps before completing and navigating", async () => {
    let release: (() => void) | undefined;
    const write = new Promise<void>((resolve) => {
      release = resolve;
    });
    const service = {
      patchSet: vi.fn(() => write),
      setExerciseNotes: vi.fn().mockResolvedValue(undefined),
      completeSet: vi.fn().mockResolvedValue(null),
    };
    const snapshot = { generation: 1, service };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SetScreen runtime={runtime} />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    await act(async () => {
      (
        root.findByProps({ "data-label": "Actual Reps" }).props as {
          onChange: () => void;
        }
      ).onChange();
      await Promise.resolve();
    });
    await act(async () => {
      (
        root.findByProps({ "data-label": "Complete Main Set" }).props as {
          onClick: () => void;
        }
      ).onClick();
      await Promise.resolve();
    });
    expect(service.patchSet).toHaveBeenCalledOnce();
    expect(service.completeSet).not.toHaveBeenCalled();
    expect(env.back).not.toHaveBeenCalled();
    await act(async () => {
      release?.();
      await write;
    });
    expect(service.completeSet).toHaveBeenCalledWith(
      { programId: "p", sessionId: "s", activityId: "a", setId: "set" },
      { actualReps: 8, weight: { value: 40, unit: "kg" }, feedback: "Neutral" },
    );
    expect(env.back).toHaveBeenCalledOnce();
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("keeps the input and prevents navigation when a save fails", async () => {
    const service = {
      patchSet: vi.fn().mockRejectedValue(new Error("disk full")),
      setExerciseNotes: vi.fn().mockResolvedValue(undefined),
      completeSet: vi.fn(),
    };
    const snapshot = { generation: 1, service };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SetScreen runtime={runtime} />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    await act(async () => {
      (
        root.findByProps({ "data-label": "Actual Reps" }).props as {
          onChange: () => void;
        }
      ).onChange();
      await Promise.resolve();
    });
    await act(async () => {
      (
        root.findByProps({ "data-label": "Complete Main Set" }).props as {
          onClick: () => void;
        }
      ).onClick();
      await Promise.resolve();
    });
    expect(env.alert).toHaveBeenCalledWith("Workout Not Saved", "disk full");
    expect(root.findByProps({ "data-label": "Actual Reps" }).props.value).toBe(
      "8",
    );
    expect(service.completeSet).not.toHaveBeenCalled();
    expect(env.back).not.toHaveBeenCalled();
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("holds a back navigation until pending recording writes complete", async () => {
    let release: (() => void) | undefined;
    const write = new Promise<void>((resolve) => {
      release = resolve;
    });
    const service = {
      patchSet: vi.fn(() => write),
      setExerciseNotes: vi.fn().mockResolvedValue(undefined),
    };
    const snapshot = { generation: 1, service };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SetScreen runtime={runtime} />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    await act(async () => {
      (
        root.findByProps({ "data-label": "Actual Reps" }).props as {
          onChange: () => void;
        }
      ).onChange();
      await Promise.resolve();
    });
    const action = { type: "GO_BACK" };
    await act(async () => {
      env.beforeRemove?.({ data: { action } });
      await Promise.resolve();
    });
    expect(env.dispatch).not.toHaveBeenCalled();
    await act(async () => {
      release?.();
      await write;
    });
    expect(env.dispatch).toHaveBeenCalledWith(action);
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("initiates header back navigation through JavaScript on iOS", async () => {
    const snapshot = {
      generation: 1,
      service: { patchSet: vi.fn(), setExerciseNotes: vi.fn() },
    };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SetScreen runtime={runtime} />);
      await Promise.resolve();
    });
    await act(async () => {
      (
        renderer?.root.findByProps({ "data-label": "Back" }).props as {
          onClick: () => void;
        }
      ).onClick();
      await Promise.resolve();
    });
    expect(env.back).toHaveBeenCalledOnce();
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("preserves the original unit when changing a recorded weight", async () => {
    const service = {
      patchSet: vi.fn().mockResolvedValue(true),
      setExerciseNotes: vi.fn().mockResolvedValue(undefined),
    };
    const snapshot = { generation: 1, service };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SetScreen runtime={runtime} />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    env.input = "45";
    await act(async () => {
      (
        renderer?.root.findByProps({ "data-label": "Weight (kg)" }).props as {
          onChange: () => void;
        }
      ).onChange();
      await Promise.resolve();
    });
    expect(service.patchSet).toHaveBeenCalledWith(expect.anything(), {
      weight: { value: 45, unit: "kg" },
    });
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });
});
