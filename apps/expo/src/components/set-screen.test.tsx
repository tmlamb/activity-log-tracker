import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WorkoutSetDetailScreen from "~/app/(public)/(app)/program/[programId]/session/[sessionId]/set/index";

const env = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  alert: vi.fn(),
  dispatch: vi.fn(),
  input: "8",
  beforeRemove: null as null | ((event: { data: { action: unknown } }) => void),
  kind: "Main",
  setStatus: "Ready",
  startable: false,
  resetSet: vi.fn(),
  patchSet: vi.fn(),
  setExerciseNotes: vi.fn(),
  completeSet: vi.fn(),
  startSet: vi.fn(),
  reconcileSet: vi.fn(),
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
  useNavigation: () => ({
    dispatch: env.dispatch,
    addListener: () => () => undefined,
  }),
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
vi.mock("~/data/actions", () => ({
  patchSet: env.patchSet,
  setExerciseNotes: env.setExerciseNotes,
  completeSet: env.completeSet,
  startSet: env.startSet,
  reconcileSet: env.reconcileSet,
  resetSet: env.resetSet,
}));
vi.mock("~/data/queries", () => ({
  useExerciseDetail: () => ({ id: "e", name: "Exercise", notes: null }),
  useEquipment: () => ({ barbells: [], plates: [] }),
  useSetContext: () => ({
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
      status: env.setStatus,
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
    isStartable: env.startable,
    canComplete: false,
  }),
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
vi.mock("./CollapsibleSection", () => ({
  CollapsibleSection: ({
    title,
    collapsed,
    onCollapsedChange,
    children,
  }: PropsWithChildren<{
    title: string;
    collapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
  }>) => (
    <section>
      <button
        data-label={title}
        onClick={() => onCollapsedChange(!collapsed)}
      />
      {!collapsed && children}
    </section>
  ),
}));
vi.mock("./ConfirmButton", () => ({
  default: ({
    children,
    accessibilityLabel,
    onConfirm,
  }: PropsWithChildren<{
    accessibilityLabel: string;
    onConfirm: () => void;
  }>) => (
    <button data-label={accessibilityLabel} onClick={onConfirm}>
      {children}
    </button>
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
  env.setStatus = "Ready";
  env.startable = false;
  env.resetSet.mockReset();
  env.patchSet.mockReset();
  env.setExerciseNotes.mockReset();
  env.completeSet.mockReset();
  env.startSet.mockReset();
  env.reconcileSet.mockReset();
});

function render() {
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(<WorkoutSetDetailScreen />);
  });
  if (!renderer) throw new Error("Renderer not created");
  return renderer;
}

function press(renderer: ReturnType<typeof create>, label: string) {
  (
    renderer.root.findByProps({ "data-label": label }).props as {
      onClick: () => void;
    }
  ).onClick();
}

function change(renderer: ReturnType<typeof create>, label: string) {
  act(() => {
    (
      renderer.root.findByProps({ "data-label": label }).props as {
        onChange: () => void;
      }
    ).onChange();
  });
}

describe("set screen interactions", () => {
  it("treats a quick second press of the action button as the same press", async () => {
    env.setStatus = "Planned";
    env.startable = true;
    const renderer = render();
    await act(async () => {
      press(renderer, "Start Main Set");
      press(renderer, "Start Main Set");
      await Promise.resolve();
    });
    expect(env.startSet).toHaveBeenCalledOnce();
    act(() => renderer.unmount());
  });

  it("offers resetting a done or running set, under a collapsed Advanced section", () => {
    env.setStatus = "Planned";
    let renderer = render();
    expect(
      renderer.root.findAllByProps({ "data-label": "Advanced" }),
    ).toHaveLength(0);
    act(() => renderer.unmount());

    // A running set (the fixture's clock started at 1).
    env.setStatus = "Ready";
    renderer = render();
    expect(
      renderer.root.findAllByProps({ "data-label": "Advanced" }),
    ).toHaveLength(1);
    act(() => renderer.unmount());

    env.setStatus = "Done";
    renderer = render();
    expect(
      renderer.root.findAllByProps({ "data-label": "Reset Workout Set" }),
    ).toHaveLength(0);
    act(() => press(renderer, "Advanced"));
    act(() => press(renderer, "Reset Workout Set"));
    expect(env.resetSet).toHaveBeenCalledWith({
      programId: "p",
      sessionId: "s",
      activityId: "a",
      setId: "set",
    });
    act(() => renderer.unmount());
  });

  it("keeps warmup targets and recording inputs in the original card groups", () => {
    env.kind = "Warmup";
    const renderer = render();
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
    act(() => renderer.unmount());
  });

  it("saves recorded reps, then completes the set and navigates back", async () => {
    const renderer = render();
    change(renderer, "Actual Reps");
    expect(env.patchSet).toHaveBeenCalledWith(
      { programId: "p", sessionId: "s", activityId: "a", setId: "set" },
      { actualReps: 8 },
    );
    await act(async () => {
      press(renderer, "Complete Main Set");
      await Promise.resolve();
    });
    expect(env.completeSet).toHaveBeenCalledWith(
      { programId: "p", sessionId: "s", activityId: "a", setId: "set" },
      { actualReps: 8, weight: { value: 40, unit: "kg" }, feedback: "Neutral" },
    );
    expect(env.back).toHaveBeenCalledOnce();
    act(() => renderer.unmount());
  });

  it("keeps the input and alerts when a save fails", () => {
    env.patchSet.mockImplementation(() => {
      throw new Error("disk full");
    });
    const renderer = render();
    change(renderer, "Actual Reps");
    expect(env.alert).toHaveBeenCalledWith("Workout Not Saved", "disk full");
    expect(
      renderer.root.findByProps({ "data-label": "Actual Reps" }).props.value,
    ).toBe("8");
    act(() => renderer.unmount());
  });

  it("stays on the set when completing fails", async () => {
    env.completeSet.mockImplementation(() => {
      throw new Error("disk full");
    });
    const renderer = render();
    change(renderer, "Actual Reps");
    await act(async () => {
      press(renderer, "Complete Main Set");
      await Promise.resolve();
    });
    expect(env.alert).toHaveBeenCalledWith("Workout Not Saved", "disk full");
    expect(env.back).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it("allows back navigation once inputs are valid", () => {
    const renderer = render();
    change(renderer, "Actual Reps");
    const action = { type: "GO_BACK" };
    act(() => env.beforeRemove?.({ data: { action } }));
    expect(env.dispatch).toHaveBeenCalledWith(action);
    expect(env.reconcileSet).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it("blocks back navigation while an input is invalid", () => {
    const renderer = render();
    env.input = ".";
    change(renderer, "Actual Reps");
    expect(env.patchSet).not.toHaveBeenCalled();
    const action = { type: "GO_BACK" };
    act(() => env.beforeRemove?.({ data: { action } }));
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(env.alert).toHaveBeenCalledWith(
      "Workout Not Saved",
      "Enter valid numbers before leaving this set.",
    );
    act(() => renderer.unmount());
  });

  it("initiates header back navigation through JavaScript on iOS", () => {
    const renderer = render();
    act(() => press(renderer, "Back"));
    expect(env.back).toHaveBeenCalledOnce();
    act(() => renderer.unmount());
  });

  it("preserves the original unit when changing a recorded weight", () => {
    const renderer = render();
    env.input = "45";
    change(renderer, "Weight (kg)");
    expect(env.patchSet).toHaveBeenCalledWith(expect.anything(), {
      weight: { value: 45, unit: "kg" },
    });
    act(() => renderer.unmount());
  });
});
