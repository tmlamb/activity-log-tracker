import type { DatabaseSync } from "node:sqlite";
import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ExerciseSelectionInput,
  SelectionTicket,
} from "~/data/selection-handoff";
import type * as Store from "~/data/store";
import ExerciseSelectScreen from "~/app/(public)/(app)/exercise/select/index";
import { createTestDb } from "~/data/database/test-db";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { setDatabase } from "~/data/store";

const env = vi.hoisted(() => ({
  params: {},
  back: vi.fn(),
  alert: vi.fn(),
}));
vi.mock("react-native-get-random-values", () => ({}));
vi.mock("~/data/store", async (importOriginal) => ({
  ...(await importOriginal<typeof Store>()),
  useGeneration: () => 7,
}));
vi.mock("react-native", () => ({
  Alert: { alert: env.alert },
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("react-native-css", () => ({ useNativeVariable: () => "#000" }));
vi.mock("react-native-reanimated", () => ({
  default: { View: ({ children }: PropsWithChildren) => <div>{children}</div> },
  FadeIn: {},
  FadeOut: {},
}));
vi.mock("@expo/ui", () => ({
  Host: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock("@expo/vector-icons/MaterialCommunityIcons", () => ({
  default: () => null,
}));
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({ addListener: () => () => undefined }),
  useIsFocused: () => true,
}));
vi.mock("expo-router", () => ({
  Redirect: () => <p>redirected</p>,
  useLocalSearchParams: () => env.params,
  useRouter: () => ({ back: env.back, push: vi.fn() }),
  Stack: {
    Screen: () => null,
    SearchBar: () => null,
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
        SearchBarSlot: () => null,
        Spacer: () => null,
      },
    ),
  },
}));
vi.mock("~/components/header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
}));
vi.mock("~/components/font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("~/components/PressableThemed", () => ({
  default: ({ children }: PropsWithChildren) => <>{children}</>,
}));
vi.mock("~/components/Typography", () => ({
  SectionHeading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));
vi.mock("~/components/CardRow", () => ({
  SelectableCardRow: ({
    title,
    selected,
    onPress,
  }: {
    title: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <button data-row={title} data-selected={selected} onClick={onPress}>
      {title}
    </button>
  ),
}));
vi.mock("~/components/Styled", () => ({
  LegendSectionListStyled: ({
    sections,
    renderSectionHeader,
    renderItem,
  }: {
    sections: { key: string; data: unknown[] }[];
    renderSectionHeader: (info: { section: unknown }) => ReactNode;
    renderItem: (info: {
      item: unknown;
      index: number;
      section: unknown;
    }) => ReactNode;
  }) => (
    <div>
      {sections.map((section) => (
        <section key={section.key}>
          {renderSectionHeader({ section })}
          {section.data.map((item, index) => (
            <div key={index}>{renderItem({ item, index, section })}</div>
          ))}
        </section>
      ))}
    </div>
  ),
}));

let raw: DatabaseSync | undefined;
const ticket: SelectionTicket = {
  generation: 7,
  ownerId: "session-form",
  requestId: "request",
  activityId: "main",
};
function request(input?: ExerciseSelectionInput) {
  useSelectionHandoff.getState().begin(ticket, "exercise", input);
  env.params = {
    requestId: "request",
    ownerId: "session-form",
    generation: "7",
    activityId: "main",
    currentExerciseId: "e",
  };
}
async function render() {
  let renderer: ReturnType<typeof create> | undefined;
  await act(async () => {
    renderer = create(<ExerciseSelectScreen />);
    await Promise.resolve();
  });
  if (!renderer) throw new Error("Renderer not created");
  const root = renderer.root;
  return {
    unmount: () => act(() => renderer?.unmount()),
    headings: () =>
      root.findAllByType("h2").flatMap((node) => node.children as string[]),
    rows: () =>
      root
        .findAll((node) => typeof node.props["data-row"] === "string")
        .map((node): [string, boolean] => [
          node.props["data-row"] as string,
          node.props["data-selected"] as boolean,
        ]),
    click: (props: Record<string, string>) =>
      act(() => {
        (root.findByProps(props).props as { onClick: () => void }).onClick();
      }),
  };
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  env.back.mockClear();
  env.alert.mockClear();
  useSelectionHandoff.setState({ entries: {} });
  const db = createTestDb(`
    INSERT INTO exercises (id, name, normalized_name, position)
      VALUES ('e', 'Bench', 'bench', 0), ('f', 'Dumbbell', 'dumbbell', 1), ('g', 'Machine', 'machine', 2);
  `);
  raw = db.raw;
  setDatabase(db);
});
afterEach(() => {
  useSelectionHandoff.setState({ entries: {} });
  setDatabase(undefined);
  raw?.close();
  raw = undefined;
});

const saved = (rows: [string, boolean][]) =>
  rows.filter(([name]) => ["Bench", "Dumbbell", "Machine"].includes(name));

describe("exercise select", () => {
  it("lists alternatives first, hides used exercises, and returns a picked alternative", async () => {
    request({
      alternatives: [{ activityId: "alt", exerciseId: "f", name: "Dumbbell" }],
      excludeExerciseIds: ["f"],
    });
    const view = await render();
    expect(view.headings().slice(0, 2)).toEqual([
      "Alternative Exercises",
      "Exercises",
    ]);
    expect(saved(view.rows())).toEqual([
      ["Dumbbell", false],
      ["Bench", true],
      ["Machine", false],
    ]);
    view.click({ "data-row": "Dumbbell" });
    view.click({ "data-label": "Done" });
    expect(env.back).toHaveBeenCalledOnce();
    expect(useSelectionHandoff.getState().entries.request?.result).toEqual({
      kind: "exercise",
      exerciseId: "f",
      alternativeId: "alt",
    });
    view.unmount();
  });

  it("lists every saved exercise without alternatives", async () => {
    request();
    const view = await render();
    expect(view.headings()).not.toContain("Alternative Exercises");
    expect(view.headings()).not.toContain("Exercises");
    expect(saved(view.rows())).toEqual([
      ["Bench", true],
      ["Dumbbell", false],
      ["Machine", false],
    ]);
    view.unmount();
  });
});
