import type { PropsWithChildren } from "react";
import type { ReactTestInstance } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { CollapsibleSectionHeader } from "./collapsible-section-header";

vi.mock("react-native", () => ({
  View: ({
    children,
    className,
  }: PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
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
  SectionHeading: ({
    children,
    className,
  }: PropsWithChildren<{ className?: string }>) => (
    <h2 className={className}>{children}</h2>
  ),
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

function renderHeader(titleParts?: string[]) {
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(
      <CollapsibleSectionHeader
        title="Barbell Squat, Pull-Up"
        titleParts={titleParts}
        collapsed={false}
        onPress={() => undefined}
        titleClassName="text-foreground"
      />,
    );
  });
  if (!renderer) throw new Error("Renderer not created");
  return renderer;
}

/** Each wrapping item's text: the unit a line can break before. */
function items(titleParts: string[]) {
  const renderer = renderHeader(titleParts);
  const row = renderer.root.find(
    (node) =>
      node.type === "div" &&
      ((node.props as { className?: string }).className?.includes(
        "flex-wrap",
      ) ??
        false),
  );
  const result = row.children.map(headingText);
  act(() => renderer.unmount());
  return result;
}

function render(titleParts?: string[]) {
  const renderer = renderHeader(titleParts);
  const text = renderer.root.findAllByType("h2").map(headingText).join("");
  act(() => renderer.unmount());
  return text;
}

describe("collapsible section header", () => {
  it("wraps title parts as whole items that each start with an arrow", () => {
    // A line can only break between items, so every new line starts with an
    // arrow; the space before the next part trails the previous one.
    expect(items(["Barbell Squat", "Pull-Up", "Barbell Fly"])).toEqual([
      "Barbell Squat\u00A0",
      "[\u21C4]\u00A0Pull-Up\u00A0",
      "[\u21C4]\u00A0Barbell Fly",
    ]);
  });

  it("lets a long part wrap inside its own item, past the arrow", () => {
    // Plain spaces, so a part too long for a line wraps within its column
    // rather than spilling the next arrow onto its last line.
    const renderer = renderHeader([
      "Barbell Dip",
      "Barbell Shrug has such an oddly long name",
    ]);
    const names = renderer.root
      .findAllByType("h2")
      .filter((node) =>
        (node.props as { className?: string }).className?.includes("shrink"),
      );
    expect(names.map(headingText)).toEqual([
      "Barbell Dip\u00A0",
      "Barbell Shrug has such an oddly long name",
    ]);
    expect(
      names.map((node) => (node.props as { className?: string }).className),
    ).toEqual([
      "shrink leading-[1.15] text-foreground",
      "shrink leading-[1.15] text-foreground",
    ]);
    act(() => renderer.unmount());
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
});
