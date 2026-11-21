import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SelectionTicket } from "~/data/selection-handoff";
import LoadScreen from "~/app/(public)/(app)/load/index";
import { useSelectionHandoff } from "~/data/selection-handoff";

const env = vi.hoisted(() => ({
  params: {},
  back: vi.fn(),
}));

vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
  KeyboardAvoidingView: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
  ScrollView: ({ children }: PropsWithChildren) => <div>{children}</div>,
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("react-native-reanimated", () => {
  const transition = {
    delay: () => transition,
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
    FadeOutDown: transition,
  };
});
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({ addListener: () => () => undefined }),
}));
vi.mock("expo-router", () => ({
  Redirect: () => null,
  useLocalSearchParams: () => env.params,
  useRouter: () => ({ back: env.back }),
  Stack: {
    Toolbar: Object.assign(
      ({ children }: { children?: ReactNode }) => <>{children}</>,
      {
        Button: ({
          children,
          onPress,
        }: {
          children?: ReactNode;
          onPress?: () => void;
        }) => (
          <button data-label={children} onClick={onPress}>
            {children}
          </button>
        ),
      },
    ),
  },
}));
vi.mock("~/data/store", () => ({ useGeneration: () => 7 }));
vi.mock("~/data/queries", () => ({ useExerciseDetail: () => null }));
vi.mock("~/data/actions", () => ({ setExerciseOneRepMax: vi.fn() }));
vi.mock("~/components/MissingDataRedirect", () => ({
  default: () => <p>redirected</p>,
}));
vi.mock("~/components/font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("~/components/header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
}));
vi.mock("~/components/Styled", () => ({
  AnimatedViewStyled: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
}));
vi.mock("~/components/Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
  SectionHeading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));
vi.mock("~/components/SegmentedInputThemed", () => ({ default: () => null }));
vi.mock("~/components/TextInputThemed", () => ({
  default: ({
    label,
    value,
    error,
    onChangeText,
  }: {
    label: string;
    value?: string;
    error?: string;
    onChangeText?: (text: string) => void;
  }) => (
    <input
      data-label={label}
      data-value={value}
      data-error={error ?? null}
      data-change={onChangeText}
    />
  ),
}));

const ticket: SelectionTicket = {
  generation: 7,
  ownerId: "form",
  requestId: "request",
  activityId: "row",
};

async function render(params: Record<string, string>) {
  useSelectionHandoff.getState().begin(ticket, "load");
  env.params = {
    requestId: ticket.requestId,
    ownerId: ticket.ownerId,
    generation: "7",
    activityId: "row",
    loadType: "RPE",
    loadValue: "8",
    ...params,
  };
  let renderer: ReturnType<typeof create> | undefined;
  await act(async () => {
    renderer = create(<LoadScreen />);
    await Promise.resolve();
  });
  if (!renderer) throw new Error("Renderer not created");
  const root = renderer.root;
  const inputs = (label: string) =>
    root
      .findAllByType("input")
      .filter((node) => node.props["data-label"] === label);
  const type = async (label: string, text: string) =>
    act(async () => {
      (inputs(label)[0]?.props as { "data-change": (value: string) => void })[
        "data-change"
      ](text);
      await Promise.resolve();
    });
  const done = async () =>
    act(async () => {
      (
        root.findByProps({ "data-label": "Done" }).props as {
          onClick: () => void;
        }
      ).onClick();
      // Let the form's validation and submit settle.
      for (let step = 0; step < 5; step++) await Promise.resolve();
    });
  const result = () =>
    useSelectionHandoff.getState().entries[ticket.requestId]?.result ?? null;
  return { inputs, type, done, result };
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  env.back.mockClear();
  useSelectionHandoff.setState({ entries: {} });
});
afterEach(() => useSelectionHandoff.setState({ entries: {} }));

describe("load screen drop percentage", () => {
  const label = "Drop Set Reduction (%)";

  it("is only offered for a row with drop sets", async () => {
    const view = await render({ dropSetCount: "0", dropPercent: "" });
    expect(view.inputs(label)).toHaveLength(0);
    await view.done();
    // No drop percentage is chosen for a row without drop sets.
    expect(view.result()).toEqual({
      kind: "load",
      load: { type: "RPE", value: 8 },
    });
  });

  it("starts at the row's percentage, or 20%, and returns the one entered", async () => {
    const saved = await render({ dropSetCount: "2", dropPercent: "0.3" });
    expect(saved.inputs(label)[0]?.props["data-value"]).toBe("30");
    useSelectionHandoff.setState({ entries: {} });

    const view = await render({ dropSetCount: "2", dropPercent: "" });
    expect(view.inputs(label)[0]?.props["data-value"]).toBe("20");
    await view.type(label, "12.5");
    await view.done();
    expect(view.result()).toEqual({
      kind: "load",
      load: { type: "RPE", value: 8 },
      dropPercent: 0.125,
    });
    expect(env.back).toHaveBeenCalled();
  });

  it("requires a percentage between 0.01 and 99.99", async () => {
    const view = await render({ dropSetCount: "1", dropPercent: "" });
    for (const text of ["", "0", "100"]) {
      await view.type(label, text);
      await view.done();
      expect(view.result()).toBeNull();
      expect(view.inputs(label)[0]?.props["data-error"]).toBe(
        "Percentage must be between 0.01 and 99.99",
      );
    }
  });
});
