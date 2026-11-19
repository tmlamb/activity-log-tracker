import type { PropsWithChildren } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import ExerciseInsights from "./exercise-insights";

vi.mock("react-native", () => ({
  ScrollView: ({ children }: PropsWithChildren) => <div>{children}</div>,
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./BarChart", () => ({ default: () => null }));
vi.mock("./Card", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
}));
vi.mock("./CardRow", () => ({
  DetailCardRow: () => null,
  NavigationCardRow: ({
    title,
    onPress,
  }: {
    title: string;
    onPress: () => void;
  }) => (
    <button data-row={title} onClick={onPress}>
      {title}
    </button>
  ),
}));
vi.mock("./CollapsibleSection", () => ({
  useCollapsibleSectionScroll: () => ({
    onListLayout: () => undefined,
    onScroll: () => undefined,
    prepareSectionToggle: () => undefined,
  }),
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
      <button data-title={title} onClick={() => onCollapsedChange(!collapsed)}>
        {title}
      </button>
      {!collapsed && children}
    </section>
  ),
}));

describe("exercise insights alternatives", () => {
  it("lists alternatives under a section collapsed by default", () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const onPress = vi.fn();
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(
        <ExerciseInsights
          exerciseName="Bench"
          sessionName="Day"
          insights={[]}
          alternatives={[
            { id: "a1", name: "Dumbbell", onPress },
            { id: "a2", name: "Machine", onPress: vi.fn() },
          ]}
        />,
      );
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    const rows = () =>
      root
        .findAll((node) => typeof node.props["data-row"] === "string")
        .map((node) => node.props["data-row"] as string);
    expect(
      root.findAllByProps({ "data-title": "Alternative Exercises" }),
    ).toHaveLength(1);
    expect(rows()).toEqual([]);
    act(() => {
      (
        root.findByProps({ "data-title": "Alternative Exercises" }).props as {
          onClick: () => void;
        }
      ).onClick();
    });
    expect(rows()).toEqual(["Dumbbell", "Machine"]);
    act(() => {
      (
        root.findByProps({ "data-row": "Dumbbell" }).props as {
          onClick: () => void;
        }
      ).onClick();
    });
    expect(onPress).toHaveBeenCalledOnce();
    act(() => renderer?.unmount());
  });

  it("omits the section without alternatives", () => {
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(
        <ExerciseInsights
          exerciseName="Bench"
          sessionName="Day"
          insights={[]}
        />,
      );
    });
    expect(
      renderer?.root.findAllByProps({ "data-title": "Alternative Exercises" }),
    ).toHaveLength(0);
    act(() => renderer?.unmount());
  });
});
