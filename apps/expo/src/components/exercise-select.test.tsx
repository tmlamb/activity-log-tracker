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
import { setDatabase, write } from "~/data/store";

const env = vi.hoisted(() => ({
  params: {},
  back: vi.fn(),
  alert: vi.fn(),
  focused: true,
  list: { name: "list" },
  animateScroll: vi.fn(
    (
      _getList: () => unknown,
      _matches: (row: unknown) => boolean,
      _getInsets: () => unknown,
    ) =>
      () =>
        undefined,
  ),
}));
vi.mock("react-native-get-random-values", () => ({}));
vi.mock("~/data/store", async (importOriginal) => ({
  ...(await importOriginal<typeof Store>()),
  useGeneration: () => 7,
}));
vi.mock("react-native", () => ({
  Alert: { alert: env.alert },
  StyleSheet: { absoluteFill: {} },
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 70, bottom: 90, left: 0, right: 0 }),
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
  useIsFocused: () => env.focused,
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
vi.mock("~/utils/animate-list-scroll", () => ({
  animateListScrollToCenter: env.animateScroll,
}));
vi.mock("~/components/Styled", () => ({
  LegendSectionListStyled: ({
    ref,
    sections,
    renderSectionHeader,
    renderItem,
  }: {
    ref?: { current: unknown };
    sections: { key: string; data: unknown[] }[];
    renderSectionHeader: (info: { section: unknown }) => ReactNode;
    renderItem: (info: {
      item: unknown;
      index: number;
      section: unknown;
    }) => ReactNode;
  }) => {
    if (ref) ref.current = env.list;
    return (
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
    );
  },
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
    rerender: () => act(() => renderer?.update(<ExerciseSelectScreen />)),
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
  env.animateScroll.mockClear();
  env.focused = true;
  vi.useFakeTimers();
  useSelectionHandoff.setState({ entries: {} });
  const db = createTestDb(`
    INSERT INTO exercises (id, name, normalized_name, position)
      VALUES ('e', 'Bench', 'bench', 0), ('f', 'Dumbbell', 'dumbbell', 1), ('g', 'Machine', 'machine', 2);
  `);
  raw = db.raw;
  setDatabase(db);
});
afterEach(() => {
  vi.useRealTimers();
  useSelectionHandoff.setState({ entries: {} });
  setDatabase(undefined);
  raw?.close();
  raw = undefined;
});

const addExercise = (id: string, name: string) =>
  act(() =>
    write((db) => {
      db.runSync(
        "INSERT INTO exercises (id, name, normalized_name, position) VALUES (?, ?, ?, 3)",
        id,
        name,
        name.toLowerCase(),
      );
    }),
  );

/**
 * The list the picker scrolled and the screen's insets, checked, and the saved
 * exercise it centers.
 */
function scrollTarget() {
  const [getList, matches, getInsets] = env.animateScroll.mock.calls[0] ?? [];
  expect(getList?.()).toBe(env.list);
  expect(getInsets?.()).toMatchObject({ top: 70, bottom: 90 });
  const rows = ["e", "n"].flatMap((id) =>
    (["saved", "preset"] as const).map((kind) => ({
      kind: "item",
      item: { kind, id },
    })),
  );
  const found = rows.filter((row) => matches?.(row));
  expect(found).toHaveLength(1);
  return found[0]?.item.id;
}

const saved = (rows: [string, boolean][]) =>
  rows.filter(([name]) => ["Bench", "Dumbbell", "Machine"].includes(name));

describe("exercise select", () => {
  it("lists alternatives first, hides used exercises, and returns a picked alternative", async () => {
    request({
      alternatives: [{ activityId: "alt", exerciseId: "f" }],
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

  it("follows an alternative renamed while the picker is open", async () => {
    request({
      alternatives: [{ activityId: "alt", exerciseId: "f" }],
      excludeExerciseIds: ["f"],
    });
    const view = await render();
    act(() =>
      write((db) => {
        db.runSync("UPDATE exercises SET name = 'Renamed' WHERE id = 'f'");
      }),
    );
    expect(view.rows()[0]).toEqual(["Renamed", false]);
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

  it("selects and centers an exercise added while the picker is open", async () => {
    request();
    env.params = { ...env.params, currentExerciseId: undefined };
    const view = await render();
    expect(saved(view.rows())).toEqual([
      ["Bench", false],
      ["Dumbbell", false],
      ["Machine", false],
    ]);
    // The add form covers the picker until it saves and goes back.
    env.focused = false;
    addExercise("n", "Curl");
    expect(env.animateScroll).not.toHaveBeenCalled();
    env.focused = true;
    view.rerender();
    expect(view.rows().slice(0, 4)).toEqual([
      ["Bench", false],
      ["Curl", true],
      ["Dumbbell", false],
      ["Machine", false],
    ]);
    // The scroll waits for the closing modal and this screen to settle.
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(env.animateScroll).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(env.animateScroll).toHaveBeenCalledOnce();
    expect(scrollTarget()).toEqual("n");
    view.unmount();
  });

  it("keeps an existing selection when an exercise is added", async () => {
    request();
    const view = await render();
    addExercise("n", "Curl");
    expect(view.rows().slice(0, 4)).toEqual([
      ["Bench", true],
      ["Curl", false],
      ["Dumbbell", false],
      ["Machine", false],
    ]);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(scrollTarget()).toEqual("n");
    view.unmount();
  });
});
