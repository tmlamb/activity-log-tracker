import type { DatabaseSync } from "node:sqlite";
import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SessionFormScreen from "~/app/(public)/(app)/program/[programId]/session/form/index";
import * as actions from "~/data/actions";
import { createTestDb } from "~/data/database/test-db";
import { useSelectionHandoff } from "~/data/selection-handoff";
import { read, setDatabase, write } from "~/data/store";

const env = vi.hoisted(() => ({
  focused: true,
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  dismissTo: vi.fn(),
  alert: vi.fn(),
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
  useNavigation: () => ({ addListener: () => () => undefined }),
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
vi.mock("~/data/actions", async (importOriginal) => {
  const original = await importOriginal<typeof actions>();
  return { ...original, createSession: vi.fn(original.createSession) };
});
vi.mock("~/hooks/use-unsaved-changes-warning", async () => {
  const { useRef } = await import("react");
  return {
    default: function useUnsavedChangesWarning() {
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
vi.mock("./header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
  headerIcons: { insights: "chart.bar.xaxis.ascending", plus: "plus" },
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
  default: ({
    label,
    editable = true,
    onChangeText,
  }: {
    label: string;
    editable?: boolean;
    onChangeText?: (text: string) => void;
  }) => (
    <div data-input={label} data-editable={editable} data-change={onChangeText}>
      {label}
    </div>
  ),
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
  SectionHeading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));

let raw: DatabaseSync | undefined;
const sessionNames = () =>
  read((db) =>
    db.getAllSync<{ name: string }>(
      "SELECT name FROM sessions ORDER BY position",
    ),
  ).map(({ name }) => name);

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  env.focused = true;
  env.back.mockClear();
  env.push.mockClear();
  env.alert.mockClear();
  vi.mocked(actions.createSession).mockClear();
  useSelectionHandoff.setState({ entries: {} });
  const db = createTestDb(`
    INSERT INTO programs (id, name, position) VALUES ('p', 'Program', 0);
    INSERT INTO exercises (id, name, normalized_name, position)
      VALUES ('e', 'Exercise', 'exercise', 0);
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

describe("session editor interactions", () => {
  it("shows the original plan-source selector before opening a new session editor", async () => {
    raw?.exec(
      "INSERT INTO sessions (program_id, id, name, position, status, deload) VALUES ('p', 'old', 'Old', 0, 'Done', 0)",
    );
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionFormScreen />);
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

  it("uses a scoped exercise selection and saves the session once before leaving", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionFormScreen />);
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
      renderer?.update(<SessionFormScreen />);
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
      renderer?.update(<SessionFormScreen />);
      await Promise.resolve();
    });
    expect(
      root
        .findAllByType("span")
        .some((node) => node.children.includes("Exercise")),
    ).toBe(true);
    await act(async () => {
      // A second tap while the screen closes must not save again or alert.
      click("Save");
      click("Save");
      await Promise.resolve();
    });
    expect(env.alert).not.toHaveBeenCalled();
    expect(actions.createSession).toHaveBeenCalledOnce();
    expect(actions.createSession).toHaveBeenCalledWith(
      "p",
      expect.any(String),
      expect.objectContaining({
        name: "Training",
        activities: [expect.objectContaining({ exerciseId: "e" })],
      }),
      null,
    );
    expect(sessionNames()).toEqual(["Training"]);
    expect(env.back).toHaveBeenCalledOnce();
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("hands an activity to advanced settings and applies the saved alternatives", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionFormScreen />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    const click = (label: string) => {
      const item = root
        .findAllByType("button")
        .find((button) => button.props["data-label"] === label);
      if (!item) throw new Error(`Missing button ${label}`);
      (item.props as { onClick: () => void }).onClick();
    };
    const refocus = async (between?: () => void) => {
      await act(async () => {
        env.focused = false;
        renderer?.update(<SessionFormScreen />);
        await Promise.resolve();
      });
      await act(async () => {
        between?.();
        await Promise.resolve();
      });
      await act(async () => {
        env.focused = true;
        renderer?.update(<SessionFormScreen />);
        await Promise.resolve();
      });
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
      click("Navigate to advanced activity settings form");
      await Promise.resolve();
    });
    expect(env.push).toHaveBeenCalledOnce();
    expect(env.push).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/\(public\)\/\(app\)\/program\/p\/session\/form\/advanced\?activityId=[^&]+&requestId=/,
      ),
    );
    const entry = Object.values(useSelectionHandoff.getState().entries)[0];
    if (entry?.kind !== "activity")
      throw new Error("Missing activity settings request");
    const input = entry.input;
    expect(input.activity.id).toBe(entry.ticket.activityId);
    expect(input.weights.parentIndex).toBe(0);

    // Advanced settings saves a main exercise and two alternatives.
    const {
      alternatives: _none,
      supersets: _empty,
      ...fields
    } = input.activity;
    const alternative = (id: string) => ({
      ...fields,
      id,
      exerciseId: "e",
      warmupSets: [],
      mainSets: input.activity.mainSets
        .slice(0, 1)
        .map((item) => ({ ...item, id: `${id}-m` })),
    });
    await refocus(() =>
      expect(
        useSelectionHandoff.getState().complete(entry.ticket, {
          kind: "activity",
          activity: {
            ...input.activity,
            exerciseId: "e",
            alternatives: [alternative("alt-1"), alternative("alt-2")],
          },
        }),
      ).toBe(true),
    );
    expect(
      root
        .findAllByType("span")
        .some((node) => node.children.includes("2 Alternatives")),
    ).toBe(true);
    expect(useSelectionHandoff.getState().entries).toEqual({});

    // Returning from advanced settings must not cancel the next selection,
    // which lists the alternatives to swap in.
    // Renaming an exercise from a picker shows here too.
    await act(async () => {
      write((db) =>
        db.runSync("UPDATE exercises SET name = 'Renamed' WHERE id = 'e'"),
      );
      await Promise.resolve();
    });
    expect(
      root
        .findAllByType("span")
        .some((node) => node.children.includes("Renamed")),
    ).toBe(true);
    await act(async () => {
      click("Navigate to select exercise form");
      await Promise.resolve();
    });
    const picks = Object.values(useSelectionHandoff.getState().entries);
    expect(picks).toHaveLength(1);
    const pick = picks[0];
    if (pick?.kind !== "exercise") throw new Error("Missing exercise request");
    expect(pick.input).toEqual({
      alternatives: [
        { activityId: "alt-1", exerciseId: "e" },
        { activityId: "alt-2", exerciseId: "e" },
      ],
      excludeExerciseIds: ["e"],
    });
    // Picking an alternative swaps it in; the former main becomes one.
    await refocus(() =>
      expect(
        useSelectionHandoff.getState().complete(pick.ticket, {
          kind: "exercise",
          exerciseId: "e",
          alternativeId: "alt-2",
        }),
      ).toBe(true),
    );

    // A row with alternatives always confirms before it is removed.
    await act(async () => {
      click("Remove exercise from Session");
      await Promise.resolve();
    });
    expect(env.alert).toHaveBeenCalledWith(
      "Delete Activity?",
      "This will remove the activity and its 2 alternatives from this session.",
      expect.any(Array),
    );
    env.alert.mockClear();

    await act(async () => {
      click("Save");
      await Promise.resolve();
    });
    expect(env.alert).not.toHaveBeenCalled();
    expect(actions.createSession).toHaveBeenCalledWith(
      "p",
      expect.any(String),
      expect.objectContaining({
        activities: [
          expect.objectContaining({
            id: "alt-2",
            exerciseId: "e",
            alternatives: [
              expect.objectContaining({ id: "alt-1" }),
              expect.objectContaining({ id: input.activity.id }),
            ],
          }),
        ],
      }),
      null,
    );
    expect(
      raw
        ?.prepare(
          "SELECT id, parent_activity_id AS parent, position FROM activities WHERE parent_activity_id IS NOT NULL ORDER BY position",
        )
        .all(),
    ).toEqual([
      { id: "alt-1", parent: "alt-2", position: 0 },
      { id: input.activity.id, parent: "alt-2", position: 1 },
    ]);
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("keeps the draft open after a failed save and permits retry", async () => {
    vi.mocked(actions.createSession).mockImplementationOnce(() => {
      throw new Error("disk full");
    });
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionFormScreen />);
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
    expect(sessionNames()).toEqual([]);
    await act(async () => {
      (
        root.findByProps({ "data-label": "Save" }).props as {
          onClick: () => void;
        }
      ).onClick();
      await Promise.resolve();
    });
    expect(sessionNames()).toEqual(["Training"]);
    expect(env.back).toHaveBeenCalledOnce();
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });

  it("shows an activity's supersets and keeps them aligned with it", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(<SessionFormScreen />);
      await Promise.resolve();
    });
    if (!renderer) throw new Error("Renderer not created");
    const root = renderer.root;
    const click = (label: string) => {
      const item = root
        .findAllByType("button")
        .find((button) => button.props["data-label"] === label);
      if (!item) throw new Error(`Missing button ${label}`);
      (item.props as { onClick: () => void }).onClick();
    };
    const input = (label: string) =>
      root.findAllByProps({ "data-input": label })[0]?.props as {
        "data-editable": boolean;
        "data-change": (text: string) => void;
      };
    await act(async () => {
      (
        root.findByProps({ "data-label": "Session Name" }).props as {
          onChange: () => void;
        }
      ).onChange();
      click("Add Exercise");
      await Promise.resolve();
    });
    await act(async () => {
      click("Navigate to advanced activity settings form");
      await Promise.resolve();
    });
    const entry = Object.values(useSelectionHandoff.getState().entries)[0];
    if (entry?.kind !== "activity")
      throw new Error("Missing activity settings request");
    expect(entry.input).toMatchObject({
      role: "activity",
      otherExerciseIds: [],
    });
    const { activity } = entry.input;
    const { alternatives: _none, supersets: _empty, ...fields } = activity;
    await act(async () => {
      env.focused = false;
      renderer?.update(<SessionFormScreen />);
      await Promise.resolve();
    });
    await act(async () => {
      useSelectionHandoff.getState().complete(entry.ticket, {
        kind: "activity",
        activity: {
          ...activity,
          exerciseId: "e",
          restMinutes: 0,
          supersets: [
            {
              ...fields,
              id: "member",
              exerciseId: "e",
              restMinutes: 0,
              warmupSets: activity.warmupSets.map((item, index) => ({
                ...item,
                id: `member-w${index}`,
              })),
              mainSets: activity.mainSets.map((item, index) => ({
                ...item,
                id: `member-m${index}`,
              })),
              alternatives: [],
            },
          ],
        },
      });
      await Promise.resolve();
    });
    await act(async () => {
      env.focused = true;
      renderer?.update(<SessionFormScreen />);
      await Promise.resolve();
    });
    expect(
      root
        .findAllByType("span")
        .some((node) => node.children.includes("1 Superset")),
    ).toBe(true);
    expect(input("Rest (minutes)")["data-editable"]).toBe(false);

    // Superset exercises follow the activity's set counts, drop sets too.
    await act(async () => {
      input("Main Sets")["data-change"]("4");
      input("Drop Sets")["data-change"]("2");
      await Promise.resolve();
    });
    await act(async () => {
      click("Save");
      await Promise.resolve();
    });
    expect(env.alert).not.toHaveBeenCalled();
    const saved = vi.mocked(actions.createSession).mock.lastCall?.[2];
    expect(saved?.activities[0]).toMatchObject({
      restMinutes: 0,
      supersets: [{ id: "member", restMinutes: 0 }],
    });
    expect(saved?.activities[0]?.mainSets).toHaveLength(4);
    expect(saved?.activities[0]?.supersets[0]?.mainSets).toHaveLength(4);
    expect(saved?.activities[0]?.dropSets).toHaveLength(2);
    expect(saved?.activities[0]?.supersets[0]?.dropSets).toHaveLength(2);
    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });
});
