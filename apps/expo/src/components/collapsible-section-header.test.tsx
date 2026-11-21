import type { PropsWithChildren } from "react";
import type { ReactTestInstance } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import {
  CollapsibleSectionHeader,
  unbreakable,
} from "./collapsible-section-header";

vi.mock("react-native", () => ({
  Platform: {
    select: (options: { ios?: unknown; default?: unknown }) => options.ios,
  },
}));
vi.mock("react-native-reanimated", () => ({
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: () => ({}),
  withTiming: (value: number) => value,
}));
vi.mock("@expo/vector-icons", () => ({ AntDesign: () => null }));
vi.mock("./font-scale-text", () => ({
  AnimatedText: ({ children }: PropsWithChildren) => <i>{children}</i>,
  Text: ({
    children,
    className,
    style,
  }: PropsWithChildren<{
    className?: string;
    style?: { fontFamily?: string };
  }>) => (
    <span className={className} data-font={style?.fontFamily}>
      {children}
    </span>
  ),
}));
vi.mock("./PressableThemed", () => ({
  default: ({ children }: PropsWithChildren) => <button>{children}</button>,
}));
vi.mock("./Typography", () => ({
  SectionHeading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));

/** The heading's text, with muted runs wrapped in brackets. */
function headingText(node: ReactTestInstance | string): string {
  if (typeof node === "string") return node;
  const text = node.children.map(headingText).join("");
  return node.type === "span" &&
    (node.props as { className?: string }).className?.includes("text-muted")
    ? `[${text}]`
    : text;
}

function render(titleParts?: string[]) {
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(
      <CollapsibleSectionHeader
        title="Barbell Squat, Pull-Up"
        titleParts={titleParts}
        collapsed={false}
        onPress={() => undefined}
      />,
    );
  });
  if (!renderer) throw new Error("Renderer not created");
  const text = headingText(renderer.root.findByType("h2"));
  act(() => renderer?.unmount());
  return text;
}

describe("collapsible section header", () => {
  it("joins title parts with muted arrows that only break before an arrow", () => {
    // Only the space before each arrow can break; names and "⇄ " stay whole,
    // with a word joiner keeping the arrow with its space.
    expect(render(["Barbell Squat", "Pull-Up", "Barbell Fly"])).toBe(
      "Barbell\u00A0Squat [\u21C4]\u2060\u00A0Pull\u2011Up [\u21C4]\u2060\u00A0Barbell\u00A0Fly",
    );
  });

  it("sets the separator in a lighter, slightly larger fixed-width font", () => {
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(
        <CollapsibleSectionHeader
          title="Squat, Fly"
          titleParts={["Squat", "Fly"]}
          collapsed={false}
          onPress={() => undefined}
        />,
      );
    });
    const separators = renderer?.root
      .findAllByType("span")
      .filter((node) => node.children.includes("\u21C4"));
    expect(separators?.map((node) => node.props.className as string)).toEqual([
      "text-muted text-[22px] font-normal",
    ]);
    expect(
      separators?.map((node) => node.props["data-font"] as string),
    ).toEqual(["Menlo"]);
    act(() => renderer?.unmount());
  });

  it("shows the title alone without multiple parts", () => {
    expect(render()).toBe("Barbell Squat, Pull-Up");
    expect(render(["Barbell Squat"])).toBe("Barbell Squat, Pull-Up");
  });

  it("removes line breaks from inside a part", () => {
    expect(unbreakable("Single-Arm Cable Row")).toBe(
      "Single\u2011Arm\u00A0Cable\u00A0Row",
    );
  });
});
