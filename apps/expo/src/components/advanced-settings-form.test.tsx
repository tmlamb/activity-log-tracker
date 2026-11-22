import type { DatabaseSync } from "node:sqlite";
import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ActivitySettingsInput,
  SelectionTicket,
} from "~/data/selection-handoff";
import type * as Store from "~/data/store";
import AdvancedActivitySettingsScreen from "~/app/(public)/(app)/program/[programId]/session/form/advanced/index";
import { createTestDb } from "~/data/database/test-db";
import { newDraftActivity } from "~/data/domain/session-editor-draft";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { setDatabase } from "~/data/store";

const env = vi.hoisted(() => ({
  focused: true,
  dirty: false,
  params: {},
  back: vi.fn(),
  push: vi.fn(),
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
vi.mock("react-native-keyboard-controller", () => ({
  KeyboardAwareScrollView: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
}));
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({ addListener: () => () => undefined }),
  useIsFocused: () => env.focused,
}));
vi.mock("expo-router", () => ({
  Redirect: () => <p>redirected</p>,
  useLocalSearchParams: () => env.params,
  useRouter: () => ({ back: env.back, push: env.push }),
  Stack: {
    Screen: () => null,
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
vi.mock("@expo/vector-icons", () => ({
  Entypo: () => null,
  AntDesign: () => null,
  Feather: () => null,
}));
vi.mock("react-native-reanimated", () => {
  const transition = { duration: () => transition };
  return {
    default: {
      View: ({ children }: PropsWithChildren) => <div>{children}</div>,
    },
    FadeInUp: transition,
    FadeOutUp: transition,
    LinearTransition: transition,
  };
});
vi.mock("~/hooks/use-unsaved-changes-warning", async () => {
  const { useRef } = await import("react");
  return {
    default: function useUnsavedChangesWarning(dirty: boolean) {
      env.dirty = dirty;
      const left = useRef(false);
      return {
        leaveWithoutWarning: (navigate: () => void) => {
          left.current = true;
          navigate();
        },
        hasLeft: () => left.current,
      };
    },
  };
});
vi.mock("./Styled", () => ({
  AnimatedViewStyled: ({ children }: PropsWithChildren) => (
    <div>{children}</div>
  ),
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
    accessibilityLabel,
    onPress,
  }: {
    title: string;
    accessibilityLabel?: string;
    onPress?: () => void;
  }) => (
    <button data-label={accessibilityLabel} onClick={onPress}>
      {title}
    </button>
  ),
  DetailCardRow: ({ label, value }: { label: string; value: string }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
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
  default: ({
    label,
    value,
    error,
    editable = true,
    onChangeText,
  }: {
    label: string;
    value?: string;
    error?: string;
    editable?: boolean;
    onChangeText?: (text: string) => void;
  }) => (
    <input
      data-label={label}
      data-value={value}
      data-error={error ?? null}
      data-editable={editable}
      data-change={onChangeText}
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
      <h2>{title}</h2>
      <button
        data-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
        onClick={() => onCollapsedChange(!collapsed)}
      />
      {!collapsed && children}
    </section>
  ),
}));

const GENERATION = 7;
let raw: DatabaseSync | undefined;
let ticket: SelectionTicket;
let ids = 0;
const createId = () => `id-${++ids}`;

function request(input?: Partial<ActivitySettingsInput>) {
  const activity = { ...newDraftActivity(createId, undefined), id: "main" };
  ticket = {
    generation: GENERATION,
    ownerId: "session-form",
    requestId: "request",
    activityId: "main",
  };
  useSelectionHandoff.getState().begin(ticket, "activity", {
    role: "activity",
    activity,
    otherExerciseIds: [],
    savedRowIds: [],
    terminalEndMs: undefined,
    weights: {
      programId: "p",
      source: null,
      parents: [{ exerciseId: null, loadType: "RPE" }],
      parentIndex: 0,
    },
    ...input,
  });
  env.params = {
    requestId: ticket.requestId,
    ownerId: ticket.ownerId,
    generation: String(ticket.generation),
    activityId: "main",
  };
}

async function render() {
  let renderer: ReturnType<typeof create> | undefined;
  await act(async () => {
    renderer = create(<AdvancedActivitySettingsScreen />);
    await Promise.resolve();
  });
  if (!renderer) throw new Error("Renderer not created");
  const root = renderer.root;
  const buttons = (label: string) =>
    root
      .findAllByType("button")
      .filter((item) => item.props["data-label"] === label);
  const click = async (label: string, index = 0) => {
    const item = buttons(label)[index];
    if (!item) throw new Error(`Missing button ${label}`);
    await act(async () => {
      (item.props as { onClick: () => void }).onClick();
      await Promise.resolve();
    });
  };
  const texts = () =>
    root.findAllByType("span").flatMap((node) => node.children);
  /** Leave for a picker, let it complete its request, then come back. */
  const pick = async (complete: (pending: SelectionTicket) => void) => {
    const pending = Object.values(useSelectionHandoff.getState().entries).find(
      (entry) => entry.ticket.ownerId !== "session-form",
    );
    if (!pending) throw new Error("No picker request");
    await act(async () => {
      env.focused = false;
      renderer?.update(<AdvancedActivitySettingsScreen />);
      await Promise.resolve();
    });
    await act(async () => {
      complete(pending.ticket);
      await Promise.resolve();
    });
    await act(async () => {
      env.focused = true;
      renderer?.update(<AdvancedActivitySettingsScreen />);
      await Promise.resolve();
    });
  };
  const result = () =>
    useSelectionHandoff.getState().entries[ticket.requestId]?.result ?? null;
  return { renderer, root, buttons, click, texts, pick, result };
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  env.focused = true;
  env.dirty = false;
  env.back.mockClear();
  env.push.mockClear();
  env.alert.mockClear();
  ids = 0;
  useSelectionHandoff.setState({ entries: {} });
  const db = createTestDb(`
    INSERT INTO programs (id, name, position) VALUES ('p', 'Program', 0);
    INSERT INTO exercises (id, name, normalized_name, position)
      VALUES ('e', 'Exercise', 'exercise', 0), ('f', 'Other', 'other', 1);
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

describe("advanced activity settings", () => {
  it("redirects without a matching request", async () => {
    env.params = { requestId: "missing" };
    const view = await render();
    expect(view.root.findAllByType("p")[0]?.children).toEqual(["redirected"]);
  });

  it("validates new alternatives and saves the edited activity", async () => {
    request();
    const view = await render();
    // Alternatives and supersets are both always available.
    expect(view.root.findAllByType("h2").map((node) => node.children)).toEqual([
      ["Alternative Exercises"],
      ["Supersets"],
    ]);
    expect(view.texts()).toContain("Select Exercise");
    await view.click("Add Alternative Exercise");
    expect(env.dirty).toBe(true);

    // A new alternative has no exercise yet.
    await view.click("Save");
    expect(view.result()).toBeNull();
    expect(env.back).not.toHaveBeenCalled();
    expect(view.texts()).toContain("Required");

    // The main exercise card and the alternative row each pick an exercise.
    await view.click("Navigate to select exercise form", 0);
    expect(env.push).toHaveBeenLastCalledWith(
      expect.stringContaining("/exercise/select?activityId=main&"),
    );
    await view.pick((pending) =>
      useSelectionHandoff
        .getState()
        .complete(pending, { kind: "exercise", exerciseId: "f" }),
    );
    await view.click("Navigate to select exercise form", 1);
    await view.pick((pending) =>
      useSelectionHandoff
        .getState()
        .complete(pending, { kind: "exercise", exerciseId: "e" }),
    );
    expect(view.texts()).toEqual(expect.arrayContaining(["Other", "Exercise"]));

    await view.click("Save");
    expect(env.back).toHaveBeenCalledOnce();
    expect(view.result()).toMatchObject({
      kind: "activity",
      activity: {
        id: "main",
        exerciseId: "f",
        alternatives: [{ exerciseId: "e", loadType: "RPE", loadValue: 8 }],
      },
    });
  });

  it("swaps an alternative in from the main picker and hides used exercises", async () => {
    request();
    const view = await render();
    await view.click("Add Alternative Exercise");
    await view.click("Navigate to select exercise form", 0);
    await view.pick((pending) =>
      useSelectionHandoff
        .getState()
        .complete(pending, { kind: "exercise", exerciseId: "f" }),
    );
    await view.click("Navigate to select exercise form", 1);
    await view.pick((pending) =>
      useSelectionHandoff
        .getState()
        .complete(pending, { kind: "exercise", exerciseId: "e" }),
    );
    const pendingInput = () => {
      const pending = Object.values(
        useSelectionHandoff.getState().entries,
      ).find((entry) => entry.kind === "exercise");
      if (pending?.kind !== "exercise") throw new Error("No picker request");
      return pending.input;
    };

    // An alternative's picker hides the exercises the activity already uses.
    await view.click("Navigate to select exercise form", 1);
    expect(pendingInput()).toEqual({
      alternatives: [],
      excludeExerciseIds: ["f"],
    });
    await view.pick(() => undefined);

    // The main picker lists the alternatives; picking one swaps it in.
    await view.click("Navigate to select exercise form", 0);
    const input = pendingInput();
    const alternativeId = input?.alternatives[0]?.activityId;
    expect(input).toEqual({
      alternatives: [{ activityId: alternativeId, exerciseId: "e" }],
      excludeExerciseIds: ["e"],
    });
    await view.pick((pending) =>
      useSelectionHandoff.getState().complete(pending, {
        kind: "exercise",
        exerciseId: "e",
        alternativeId,
      }),
    );
    await view.click("Save");
    expect(view.result()).toMatchObject({
      kind: "activity",
      activity: {
        id: alternativeId,
        exerciseId: "e",
        alternatives: [{ id: "main", exerciseId: "f" }],
      },
    });
  });

  it("collapses the alternatives and reopens them when Save finds errors", async () => {
    request();
    const view = await render();
    await view.click("Add Alternative Exercise");
    await view.click("Collapse Alternative Exercises");
    expect(view.buttons("Add Alternative Exercise")).toHaveLength(0);
    expect(view.buttons("Remove alternative exercise")).toHaveLength(0);
    await view.click("Expand Alternative Exercises");
    expect(view.buttons("Add Alternative Exercise")).toHaveLength(1);
    await view.click("Collapse Alternative Exercises");
    // The new alternative has no exercise, so Save must show it.
    await view.click("Save");
    expect(view.result()).toBeNull();
    expect(view.buttons("Remove alternative exercise")).toHaveLength(1);
    expect(view.texts()).toContain("Required");
  });

  it("requires a warmup or main set on each alternative", async () => {
    request();
    const view = await render();
    await view.click("Add Alternative Exercise");
    await view.click("Navigate to select exercise form", 1);
    await view.pick((pending) =>
      useSelectionHandoff
        .getState()
        .complete(pending, { kind: "exercise", exerciseId: "e" }),
    );
    const input = (label: string) =>
      view.root.findByProps({ "data-label": label });
    const type = async (label: string, value: string) =>
      act(async () => {
        (input(label).props as { "data-change": (text: string) => void })[
          "data-change"
        ](value);
        await Promise.resolve();
      });
    const errors = () => [
      input("Warmup Sets").props["data-error"] as string | null,
      input("Main Sets").props["data-error"] as string | null,
    ];

    await type("Warmup Sets", "");
    await type("Main Sets", "");
    await view.click("Save");
    expect(view.result()).toBeNull();
    expect(errors()).toEqual(["Required", "Required"]);

    // Either kind of set satisfies the rule and clears both errors.
    await type("Main Sets", "2");
    expect(errors()).toEqual([null, null]);
    await type("Main Sets", "");
    expect(errors()).toEqual(["Required", "Required"]);
    await type("Warmup Sets", "1");
    expect(errors()).toEqual([null, null]);

    await view.click("Save");
    expect(view.result()).toMatchObject({
      activity: { alternatives: [{ warmupSets: [{}], mainSets: [] }] },
    });
  });

  it("keeps the session form's activity when cancelled", async () => {
    request();
    const view = await render();
    await view.click("Add Alternative Exercise");
    expect(env.dirty).toBe(true);
    await view.click("Cancel");
    expect(env.back).toHaveBeenCalledOnce();
    expect(view.result()).toBeNull();
  });

  it("asks before removing an alternative that was already saved", async () => {
    const saved = {
      ...newDraftActivity(createId, undefined),
      id: "main",
    };
    const { alternatives: _none, supersets: _empty, ...fields } = saved;
    request({
      activity: {
        ...saved,
        alternatives: [{ ...fields, id: "saved-alt", exerciseId: "e" }],
      },
      savedRowIds: ["saved-alt"],
    });
    const view = await render();
    await view.click("Remove alternative exercise");
    expect(env.alert).toHaveBeenCalledWith(
      "Delete Alternative?",
      expect.any(String),
      expect.any(Array),
    );
    expect(env.dirty).toBe(false);
  });

  describe("drop sets", () => {
    const inputs = (view: Awaited<ReturnType<typeof render>>, label: string) =>
      view.root
        .findAllByType("input")
        .filter((node) => node.props["data-label"] === label);
    const typeAt = async (
      view: Awaited<ReturnType<typeof render>>,
      label: string,
      index: number,
      value: string,
    ) =>
      act(async () => {
        (
          inputs(view, label)[index]?.props as {
            "data-change": (text: string) => void;
          }
        )["data-change"](value);
        await Promise.resolve();
      });
    const pickExercises = async (
      view: Awaited<ReturnType<typeof render>>,
      exerciseIds: readonly string[],
    ) => {
      // Rows after the main exercise card each need an exercise.
      for (const [index, exerciseId] of exerciseIds.entries()) {
        await view.click("Navigate to select exercise form", index + 1);
        await view.pick((pending) =>
          useSelectionHandoff
            .getState()
            .complete(pending, { kind: "exercise", exerciseId }),
        );
      }
    };

    it("has no drop set settings of its own", async () => {
      request();
      const view = await render();
      expect(inputs(view, "Drop Sets")).toHaveLength(0);
      expect(inputs(view, "Drop Percentage (%)")).toHaveLength(0);
    });

    it("shares drop sets between the activity and its superset rows", async () => {
      request();
      const view = await render();
      await view.click("Add Superset Exercise");
      await view.click("Add Superset Exercise");
      await typeAt(view, "Drop Sets", 1, "2");
      expect(
        inputs(view, "Drop Sets").map(
          (node) => node.props["data-value"] as string,
        ),
      ).toEqual(["2", "2"]);
      await pickExercises(view, ["e", "f"]);
      await view.click("Save");
      const saved = view.result();
      if (saved?.kind !== "activity") throw new Error("Not saved");
      expect(
        [saved.activity, ...saved.activity.supersets].map(
          (row) => row.dropSets.length,
        ),
      ).toEqual([2, 2, 2]);
    });

    it("plans an alternative's drop sets on their own", async () => {
      request();
      const view = await render();
      await view.click("Add Alternative Exercise");
      await typeAt(view, "Drop Sets", 0, "3");
      await pickExercises(view, ["e"]);
      await view.click("Save");
      expect(view.result()).toMatchObject({
        activity: { dropSets: [], alternatives: [{ dropSets: [{}, {}, {}] }] },
      });
    });

    it("chooses a row's drop percentage with its load", async () => {
      const main = { ...newDraftActivity(createId, undefined), id: "main" };
      const {
        alternatives: _a,
        supersets: _s,
        ...alternative
      } = newDraftActivity(createId, undefined);
      request({
        activity: {
          ...main,
          alternatives: [{ ...alternative, id: "alt", exerciseId: "e" }],
        },
      });
      const view = await render();
      await typeAt(view, "Drop Sets", 0, "1");
      await view.click("Navigate to select exercise load form");
      expect(env.push).toHaveBeenLastCalledWith(
        expect.stringContaining("&dropSetCount=1&dropPercent=&"),
      );
      await view.pick((pending) =>
        useSelectionHandoff.getState().complete(pending, {
          kind: "load",
          load: { type: "RPE", value: 9 },
          dropPercent: 0.3,
        }),
      );
      await view.click("Save");
      expect(view.result()).toMatchObject({
        activity: {
          dropPercent: null,
          alternatives: [{ loadValue: 9, dropPercent: 0.3, dropSets: [{}] }],
        },
      });
    });

    it("follows a superset exercise's drop sets on its alternatives", async () => {
      const member = { ...newDraftActivity(createId, undefined), id: "main" };
      request({
        role: "superset",
        activity: { ...member, dropSets: member.mainSets.slice(0, 1) },
      });
      const view = await render();
      await view.click("Add Alternative Exercise");
      const [row] = inputs(view, "Drop Sets");
      expect(row?.props["data-value"]).toBe("1");
      expect(row?.props["data-editable"]).toBe(false);
    });
  });

  describe("supersets", () => {
    const input = (view: Awaited<ReturnType<typeof render>>, label: string) =>
      view.root.findAllByProps({ "data-label": label });
    const pendingEntry = (kind: string) => {
      const pending = Object.values(
        useSelectionHandoff.getState().entries,
      ).find(
        (entry) =>
          entry.kind === kind && entry.ticket.ownerId !== "session-form",
      );
      if (!pending) throw new Error("No picker request");
      return pending;
    };
    const pickExercise = async (
      view: Awaited<ReturnType<typeof render>>,
      index: number,
      exerciseId: string,
    ) => {
      await view.click("Navigate to select exercise form", index);
      await view.pick((pending) =>
        useSelectionHandoff
          .getState()
          .complete(pending, { kind: "exercise", exerciseId }),
      );
    };

    it("adds superset exercises planned with the main sets and no rest", async () => {
      const main = { ...newDraftActivity(createId, undefined), id: "main" };
      request({
        activity: { ...main, warmupSets: main.warmupSets.slice(0, 1) },
      });
      const view = await render();
      await view.click("Add Superset Exercise");
      // Set counts start as the main exercise's; rest can't be edited.
      expect(
        ["Warmup Sets", "Main Sets", "Rest (minutes)"].map((label) =>
          input(view, label).map(
            (node) => node.props["data-editable"] as boolean,
          ),
        ),
      ).toEqual([[true], [true], [false]]);

      await pickExercise(view, 0, "f");
      await view.click("Navigate to select exercise form", 1);
      expect(pendingEntry("exercise").input).toEqual({
        alternatives: [],
        excludeExerciseIds: ["f"],
      });
      await view.pick((pending) =>
        useSelectionHandoff
          .getState()
          .complete(pending, { kind: "exercise", exerciseId: "e" }),
      );
      await view.click("Save");
      expect(view.result()).toMatchObject({
        kind: "activity",
        activity: {
          exerciseId: "f",
          restMinutes: 0,
          supersets: [
            {
              exerciseId: "e",
              restMinutes: 0,
              warmupSets: [{}],
              mainSets: [{}, {}, {}],
              alternatives: [],
            },
          ],
        },
      });
    });

    it("shares set counts between the activity and its superset rows", async () => {
      request();
      const view = await render();
      await view.click("Add Superset Exercise");
      await view.click("Add Superset Exercise");
      const type = async (label: string, index: number, value: string) =>
        act(async () => {
          (
            input(view, label)[index]?.props as {
              "data-change": (text: string) => void;
            }
          )["data-change"](value);
          await Promise.resolve();
        });
      // Editing either superset row resizes the activity and both rows.
      await type("Main Sets", 1, "5");
      await type("Warmup Sets", 0, "1");
      await pickExercise(view, 1, "e");
      await pickExercise(view, 2, "f");
      await view.click("Save");
      const saved = view.result();
      if (saved?.kind !== "activity") throw new Error("Not saved");
      expect(
        [saved.activity, ...saved.activity.supersets].map((row) => [
          row.warmupSets.length,
          row.mainSets.length,
        ]),
      ).toEqual([
        [1, 5],
        [1, 5],
        [1, 5],
      ]);
    });

    it("requires an exercise on each superset row", async () => {
      request();
      const view = await render();
      await view.click("Add Superset Exercise");
      await view.click("Collapse Supersets");
      await view.click("Save");
      expect(view.result()).toBeNull();
      expect(view.buttons("Remove superset exercise")).toHaveLength(1);
      expect(view.texts()).toContain("Required");
    });

    it("opens a superset exercise's own settings and applies them", async () => {
      // Routers ignore a second push until focus returns, so this screen's
      // first push must be the one under test: start with the superset.
      const main = { ...newDraftActivity(createId, undefined), id: "main" };
      const { supersets: _none, ...member } = newDraftActivity(
        createId,
        undefined,
      );
      request({
        activity: {
          ...main,
          exerciseId: "f",
          restMinutes: 0,
          supersets: [{ ...member, exerciseId: "e", restMinutes: 0 }],
        },
      });
      const view = await render();
      await view.click("Navigate to advanced activity settings form");
      expect(env.push).toHaveBeenLastCalledWith(
        expect.stringContaining("/session/form/advanced/superset?activityId="),
      );
      const pending = pendingEntry("activity");
      if (pending.kind !== "activity") throw new Error("No settings request");
      expect(pending.input).toMatchObject({
        role: "superset",
        activity: { exerciseId: "e", supersets: [] },
        otherExerciseIds: ["f"],
        weights: {
          parents: [
            { exerciseId: "f", loadType: "RPE" },
            { exerciseId: "e", loadType: "RPE" },
          ],
          parentIndex: 1,
        },
      });
      const memberId = pending.input.activity.id;
      const {
        alternatives: _alternatives,
        supersets: _supersets,
        ...fields
      } = pending.input.activity;
      await view.pick((ticket) =>
        useSelectionHandoff.getState().complete(ticket, {
          kind: "activity",
          activity: {
            ...pending.input.activity,
            alternatives: [{ ...fields, id: "member-alt", exerciseId: "f" }],
          },
        }),
      );
      await view.click("Save");
      expect(view.result()).toMatchObject({
        activity: {
          supersets: [
            {
              id: memberId,
              alternatives: [{ id: "member-alt", exerciseId: "f" }],
            },
          ],
        },
      });
    });

    it("is a superset only while it has superset exercises", async () => {
      request();
      const view = await render();
      const restEditable = () =>
        input(view, "Rest (minutes)").map(
          (node) => node.props["data-editable"] as boolean,
        );
      await view.click("Add Alternative Exercise");
      expect(restEditable()).toEqual([true]);
      // Adding a superset exercise makes this a superset: nothing rests.
      await view.click("Add Superset Exercise");
      expect(restEditable()).toEqual([false, false]);
      // An unsaved superset exercise is removed without asking.
      await view.click("Remove superset exercise");
      expect(env.alert).not.toHaveBeenCalled();
      expect(restEditable()).toEqual([true]);
    });

    it("limits a superset exercise's settings to alternatives that follow it", async () => {
      const member = { ...newDraftActivity(createId, undefined), id: "main" };
      request({
        role: "superset",
        activity: { ...member, mainSets: member.mainSets.slice(0, 2) },
        otherExerciseIds: ["f"],
      });
      const view = await render();
      // No supersets of a superset exercise.
      expect(view.buttons("Add Superset Exercise")).toHaveLength(0);
      expect(view.root.findAllByType("h2")).toHaveLength(1);
      await view.click("Add Alternative Exercise");
      await view.click("Navigate to select exercise form", 1);
      expect(pendingEntry("exercise").input).toEqual({
        alternatives: [],
        excludeExerciseIds: ["f"],
      });
      await view.pick((pending) =>
        useSelectionHandoff
          .getState()
          .complete(pending, { kind: "exercise", exerciseId: "e" }),
      );
      await view.click("Save");
      expect(view.result()).toMatchObject({
        activity: {
          restMinutes: 0,
          supersets: [],
          alternatives: [
            {
              exerciseId: "e",
              restMinutes: 0,
              warmupSets: [{}, {}, {}],
              mainSets: [{}, {}],
            },
          ],
        },
      });
    });
  });
});
