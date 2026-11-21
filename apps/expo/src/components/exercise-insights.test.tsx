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

  it("calls a superset's main sets supersets and keeps warmup sets", () => {
    const set = (setType: "Warmup" | "Main", selected: boolean) => ({
      setType,
      setNumber: 1,
      selected,
      points: [],
    });
    const render = (superset: boolean) => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(
          <ExerciseInsights
            exerciseName="Bench"
            sessionName="Day"
            insights={[set("Warmup", false), set("Main", true)]}
            superset={superset}
          />,
        );
      });
      if (!renderer) throw new Error("Renderer not created");
      const root = renderer.root;
      // Expand the warmups so both kinds of chart are shown.
      act(() => {
        (
          root.findByProps({ "data-title": "Warmup Sets" }).props as {
            onClick: () => void;
          }
        ).onClick();
      });
      const result = {
        titles: root
          .findAll((node) => typeof node.props["data-title"] === "string")
          .map((node) => node.props["data-title"] as string),
        texts: root.findAllByType("span").flatMap((node) => node.children),
      };
      act(() => renderer?.unmount());
      return result;
    };
    const superset = render(true);
    expect(superset.titles).toEqual(["Warmup Sets", "Supersets"]);
    expect(superset.texts).toEqual(
      expect.arrayContaining(["Warmup Set 1", "Superset 1"]),
    );
    expect(superset.texts).not.toContain("Main Set 1");
    const plain = render(false);
    expect(plain.titles).toEqual(["Warmup Sets", "Main Sets"]);
    expect(plain.texts).toEqual(
      expect.arrayContaining(["Warmup Set 1", "Main Set 1"]),
    );
  });

  it("shows drop sets in their own section after the main sets", () => {
    const set = (
      setType: "Warmup" | "Main" | "Drop",
      setNumber: number,
      selected = false,
    ) => ({ setType, setNumber, selected, points: [] });
    const render = (selectedType: "Main" | "Drop") => {
      let renderer: ReturnType<typeof create> | undefined;
      act(() => {
        renderer = create(
          <ExerciseInsights
            exerciseName="Bench"
            sessionName="Day"
            insights={[
              set("Main", 1, selectedType === "Main"),
              set("Drop", 1, selectedType === "Drop"),
              set("Drop", 2),
            ]}
            superset
          />,
        );
      });
      if (!renderer) throw new Error("Renderer not created");
      const root = renderer.root;
      const result = {
        titles: root
          .findAll((node) => typeof node.props["data-title"] === "string")
          .map((node) => node.props["data-title"] as string),
        texts: root.findAllByType("span").flatMap((node) => node.children),
      };
      act(() => renderer?.unmount());
      return result;
    };
    // Drop sets keep their name in a superset; only the current kind is open.
    const fromDrop = render("Drop");
    expect(fromDrop.titles).toEqual(["Supersets", "Drop Sets"]);
    expect(fromDrop.texts).toEqual(
      expect.arrayContaining(["Drop Set 1", "Drop Set 2"]),
    );
    expect(fromDrop.texts).not.toContain("Superset 1");
    const fromMain = render("Main");
    expect(fromMain.texts).toContain("Superset 1");
    expect(fromMain.texts).not.toContain("Drop Set 1");
  });
});
