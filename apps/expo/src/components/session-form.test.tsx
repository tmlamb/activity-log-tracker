import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import SessionFormScreen from "~/app/(public)/(app)/program/[programId]/session/form/index";
import { createWorkoutQueryClient } from "~/data/cache/query-client";
import { ApplicationDataProvider } from "~/data/react/application-data";
import { useSelectionHandoff } from "~/data/react/selection-handoff";

const cache = createWorkoutQueryClient();
function SessionForm({ runtime }: { runtime: ApplicationDataRuntime }) {
  return (
    <ApplicationDataProvider runtime={{ ...runtime, cache }}>
      <SessionFormScreen />
    </ApplicationDataProvider>
  );
}

const env = vi.hoisted(() => ({
  focused: true,
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  dismissTo: vi.fn(),
  alert: vi.fn(),
  sessionCount: 0,
}));
vi.mock("react-native-get-random-values", () => ({}));
vi.mock("react-native", () => ({
  Alert: { alert: env.alert },
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("react-native-keyboard-controller", () => ({
  KeyboardAwareScrollView: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
}));
vi.mock("expo-router/react-navigation", () => ({
  useIsFocused: () => env.focused,
}));
vi.mock("expo-router", () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({ programId: "p" }),
  useRouter: () => ({
    back: env.back,
    push: env.push,
    replace: env.replace,
    dismissTo: env.dismissTo,
  }),
  Stack: {
    Screen: ({
      options,
    }: {
      options: { headerRight?: () => ReactNode; headerLeft?: () => ReactNode };
    }) => (
      <>
        {options.headerLeft?.()}
        {options.headerRight?.()}
      </>
    ),
  },
}));
vi.mock("@expo/vector-icons", () => ({
  Entypo: () => null,
  AntDesign: () => null,
  Feather: () => null,
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
    FadeInUp: transition,
    FadeOutUp: transition,
    FadeOutDown: transition,
    LinearTransition: transition,
  };
});
vi.mock("./Styled", () => ({
  AnimatedViewStyled: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
}));
vi.mock("./SegmentedInputThemed", () => ({
  default: ({ onChange }: { onChange: (value: string) => void }) => (
    <button data-label="Scratch" onClick={() => onChange("Scratch")}>
      Scratch
    </button>
  ),
}));
vi.mock("~/data/react/program-queries", () => ({
  useProgramSummaries: () => ({
    data: [{ id: "p", name: "Program", sessionCount: env.sessionCount }],
  }),
}));
vi.mock("~/hooks/use-unsaved-changes-warning", () => ({
  default: () => (navigate: () => void) => navigate(),
}));
vi.mock("~/data/react/session-queries", () => ({
  useSessionEditorSeed: () => ({
    data: {
      generation: 1,
      program: { id: "p", name: "Program" },
      session: null,
      policy: null,
      exercises: [],
    },
  }),
}));
vi.mock("./Card", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./CardRow", () => ({
  PrimaryCardAction: ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <button data-label={label} onClick={onPress}>
      {label}
    </button>
  ),
  NavigationCardRow: ({
    title,
    onPress,
  }: {
    title: string;
    onPress: () => void;
  }) => (
    <button data-label={title} onClick={onPress}>
      {title}
    </button>
  ),
}));
vi.mock("./ConfirmButton", () => ({ default: () => null }));
vi.mock("./DateTimeInputThemed", () => ({ default: () => null }));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./HeaderAction", () => ({
  HeaderTextAction: ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <button data-label={label} onClick={onPress}>
      {label}
    </button>
  ),
}));
vi.mock("./MultilineTextInputThemed", () => ({
  default: ({
    label,
    value,
    onChangeText,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
  }) => (
    <input
      data-label={label}
      value={value}
      onChange={() => onChangeText("Training")}
    />
  ),
}));
vi.mock("./PressableThemed", () => ({
  default: ({
    children,
    onPress,
    accessibilityLabel,
  }: PropsWithChildren<{
    onPress?: () => void;
    accessibilityLabel?: string;
  }>) => (
    <button data-label={accessibilityLabel} onClick={onPress}>
      {children}
    </button>
  ),
}));
vi.mock("./SwitchThemed", () => ({ default: () => null }));
vi.mock("./TextInputThemed", () => ({
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
  SectionHeading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  env.focused = true;
  env.sessionCount = 0;
  env.back.mockClear();
  env.push.mockClear();
  env.alert.mockClear();
  useSelectionHandoff.setState({ entries: {} });
});
afterEach(() => useSelectionHandoff.setState({ entries: {} }));

describe("session editor interactions", () => {
  it("shows the original plan-source selector before opening a new session editor", async () => {
    env.sessionCount = 1;
    const snapshot = { generation: 1, service: {} };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionForm runtime={runtime} />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    expect(
      renderer.root.findAllByProps({ "data-label": "Session Name" }),
    ).toHaveLength(0);
    await act(async () => {
      (
        renderer?.root.findByProps({ "data-label": "Scratch" }).props as {
          onClick: () => void;
        }
      ).onClick();
      await Promise.resolve();
    });
    expect(
      renderer.root.findByProps({ "data-label": "Session Name" }),
    ).toBeDefined();
    expect(
      renderer.root.findByProps({ "data-label": "Add Exercise" }),
    ).toBeDefined();
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("uses a scoped exercise selection and waits for the session commit before leaving", async () => {
    let finish: (() => void) | undefined;
    const commit = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const service = {
      createSession: vi.fn(() => commit),
      exercise: vi.fn().mockResolvedValue({
        id: "e",
        name: "Exercise",
        deleted: false,
        loadKind: "SINGLE_WEIGHT",
        oneRepMax: null,
      }),
    };
    const snapshot = { generation: 1, service };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionForm runtime={runtime} />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    const button = (label: string) =>
      root
        .findAllByType("button")
        .find((item) => item.props["data-label"] === label);
    const click = (label: string) => {
      const item = button(label);
      if (!item) throw new Error(`Missing button ${label}`);
      (item.props as { onClick: () => void }).onClick();
    };
    await act(async () => {
      (
        root.findByProps({ "data-label": "Session Name" }).props as {
          onChange: () => void;
        }
      ).onChange();
      await Promise.resolve();
    });
    await act(async () => {
      click("Add Exercise");
      await Promise.resolve();
    });
    await act(async () => {
      click("Navigate to select exercise form");
      await Promise.resolve();
    });
    expect(env.push).toHaveBeenCalledOnce();
    const entry = Object.values(useSelectionHandoff.getState().entries)[0];
    if (!entry) throw new Error("Missing selection request");
    await act(async () => {
      env.focused = false;
      renderer?.update(<SessionForm runtime={runtime} />);
      await Promise.resolve();
    });
    await act(async () => {
      expect(
        useSelectionHandoff
          .getState()
          .complete(entry.ticket, { kind: "exercise", exerciseId: "e" }),
      ).toBe(true);
      await Promise.resolve();
    });
    await act(async () => {
      env.focused = true;
      renderer?.update(<SessionForm runtime={runtime} />);
      await Promise.resolve();
    });
    expect(
      root
        .findAllByType("span")
        .some((node) => node.children.includes("Exercise")),
    ).toBe(true);
    await act(async () => {
      click("Save");
      click("Save");
      await Promise.resolve();
    });
    expect(service.createSession).toHaveBeenCalledOnce();
    expect(service.createSession).toHaveBeenCalledWith(
      "p",
      expect.any(String),
      expect.objectContaining({
        name: "Training",
        activities: [expect.objectContaining({ exerciseId: "e" })],
      }),
      null,
    );
    expect(env.back).not.toHaveBeenCalled();
    await act(async () => {
      finish?.();
      await commit;
    });
    expect(env.back).toHaveBeenCalledOnce();
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("keeps the draft open after a failed save and permits retry", async () => {
    const service = {
      createSession: vi
        .fn()
        .mockRejectedValueOnce(new Error("disk full"))
        .mockResolvedValueOnce(undefined),
    };
    const snapshot = { generation: 1, service };
    const runtime = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
    } as unknown as ApplicationDataRuntime;
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionForm runtime={runtime} />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    await act(async () => {
      (
        root.findByProps({ "data-label": "Session Name" }).props as {
          onChange: () => void;
        }
      ).onChange();
      await Promise.resolve();
    });
    await act(async () => {
      (
        root.findByProps({ "data-label": "Save" }).props as {
          onClick: () => void;
        }
      ).onClick();
      await Promise.resolve();
    });
    expect(env.alert).toHaveBeenCalledWith("Session Not Saved", "disk full");
    expect(root.findByProps({ "data-label": "Session Name" }).props.value).toBe(
      "Training",
    );
    expect(env.back).not.toHaveBeenCalled();
    await act(async () => {
      (
        root.findByProps({ "data-label": "Save" }).props as {
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
});
