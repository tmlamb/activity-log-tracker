import type { DatabaseSync } from "node:sqlite";
import type { PropsWithChildren, ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExerciseFormScreen from "~/app/(public)/(app)/exercise/form/index";
import { replaceEquipmentInventory, replaceMuscles } from "~/data/actions";
import { createTestDb } from "~/data/database/test-db";
import { getSavedExercise } from "~/data/repositories/exercises";
import { read, setDatabase, write } from "~/data/store";

const env = vi.hoisted(() => ({
  params: {},
  focused: true,
  back: vi.fn(),
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
vi.mock("react-native-reanimated", () => ({
  default: { View: ({ children }: PropsWithChildren) => <div>{children}</div> },
  FadeInUp: {},
  FadeOutUp: {},
  LinearTransition: {},
}));
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({ addListener: () => () => undefined }),
  useIsFocused: () => env.focused,
}));
vi.mock("expo-router", () => ({
  Link: ({ children }: PropsWithChildren) => <>{children}</>,
  Redirect: () => <p>redirected</p>,
  useLocalSearchParams: () => env.params,
  useRouter: () => ({ back: env.back }),
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
vi.mock("@expo/vector-icons/MaterialCommunityIcons", () => ({
  default: () => null,
}));
vi.mock("~/hooks/use-unsaved-changes-warning", () => ({
  default: () => ({
    leaveWithoutWarning: (navigate: () => void) => navigate(),
    hasLeft: () => false,
  }),
}));
vi.mock("./CardRow", () => ({
  PrimaryCardAction: () => null,
  SelectableCardRow: ({
    title,
    selected,
    onPress,
  }: {
    title: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <button
      data-row={title}
      data-label={title}
      data-selected={selected}
      onClick={onPress}
    />
  ),
}));
vi.mock("./ConfirmButton", () => ({ default: () => null }));
vi.mock("./header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
}));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./MultilineTextInputThemed", () => ({
  default: ({
    label,
    value,
    onChangeText,
  }: {
    label: string;
    value?: string;
    onChangeText: (text: string) => void;
  }) => <input data-label={label} value={value} data-change={onChangeText} />,
}));
vi.mock("./PressableThemed", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./SegmentedInputThemed", () => ({ default: () => null }));
vi.mock("./TextInputThemed", () => ({ default: () => null }));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
  SectionHeading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));

const barbell = (barbellId: string, value: number) => ({
  barbellId,
  value,
  unit: "lbs" as const,
});
const setBarbells = (...barbells: ReturnType<typeof barbell>[]) =>
  replaceEquipmentInventory({ barbells, plates: [] });
let raw: DatabaseSync | undefined;

async function render(exerciseId?: string) {
  env.params = exerciseId ? { exerciseId } : {};
  let renderer: ReturnType<typeof create> | undefined;
  await act(async () => {
    renderer = create(<ExerciseFormScreen />);
    await Promise.resolve();
  });
  if (!renderer) throw new Error("Renderer not created");
  const root = renderer.root;
  const update = async (focused: boolean, job?: () => void) => {
    await act(async () => {
      env.focused = focused;
      renderer?.update(<ExerciseFormScreen />);
      await Promise.resolve();
    });
    if (job)
      await act(async () => {
        job();
        await Promise.resolve();
      });
  };
  const props = (label: string) =>
    root.findByProps({ "data-label": label }).props as {
      onClick: () => void;
      "data-change": (text: string) => void;
    };
  return {
    /** Make changes on another screen opened over this one, then come back. */
    visit: async (job: () => void) => {
      await update(false, job);
      await update(true);
    },
    rows: () =>
      root
        .findAll((node) => typeof node.props["data-row"] === "string")
        .map((node) => [
          node.props["data-row"] as string,
          node.props["data-selected"] as boolean,
        ]),
    click: async (label: string) => {
      await act(async () => {
        props(label).onClick();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    },
    type: async (label: string, text: string) => {
      await act(async () => {
        props(label)["data-change"](text);
        await Promise.resolve();
      });
    },
    value: (label: string) =>
      root.findByProps({ "data-label": label }).props.value as string,
    unmount: () => act(() => renderer?.unmount()),
  };
}
const saved = () => read((db) => getSavedExercise(db, "e"));

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  env.focused = true;
  env.back.mockClear();
  env.alert.mockClear();
  const db = createTestDb(`
    INSERT INTO barbells (id, position, value, unit)
      VALUES ('b45', 0, 45, 'lbs'), ('b35', 1, 35, 'lbs');
    INSERT INTO muscle_labels (id, name, normalized_name)
      VALUES (901, 'Chest', 'chest'), (902, 'Triceps', 'triceps');
    INSERT INTO muscle_catalog (position, muscle_id) VALUES (0, 901), (1, 902);
    INSERT INTO exercises (id, name, normalized_name, position, load_kind, barbell_id)
      VALUES ('e', 'Bench', 'bench', 0, 'BARBELL', 'b35');
    INSERT INTO exercise_muscles (exercise_id, position, muscle_id)
      VALUES ('e', 0, 901), ('e', 1, 902);`);
  raw = db.raw;
  setDatabase(db);
});
afterEach(() => {
  setDatabase(undefined);
  raw?.close();
  raw = undefined;
});

describe("exercise form", () => {
  it("lists barbells and muscles added while it is open, keeping the draft", async () => {
    const view = await render("e");
    await view.type("Exercise Name", "Bench Press");
    await view.visit(() => {
      setBarbells(barbell("b55", 55), barbell("b45", 45), barbell("b35", 35));
      replaceMuscles(["Chest", "Triceps", "Back"]);
    });
    expect(view.rows()).toEqual([
      ["55lbs", false],
      ["45lbs", false],
      ["35lbs", true],
      ["Back", false],
      ["Chest", true],
      ["Triceps", true],
    ]);
    expect(view.value("Exercise Name")).toBe("Bench Press");
    await view.click("55lbs");
    await view.click("Back");
    await view.click("Save");
    expect(env.alert).not.toHaveBeenCalled();
    expect(env.back).toHaveBeenCalledOnce();
    expect(saved()).toMatchObject({
      name: "Bench Press",
      barbellId: "b55",
      primaryMuscles: ["Chest", "Triceps", "Back"],
    });
    view.unmount();
  });

  it("shows the first barbell added from a new exercise, selected", async () => {
    setBarbells();
    const view = await render();
    await view.visit(() => setBarbells(barbell("new", 45)));
    expect(view.rows()[0]).toEqual(["45lbs", true]);
    view.unmount();
  });

  it("still saves after its own barbell and muscle were removed", async () => {
    const view = await render("e");
    await view.visit(() => {
      setBarbells(barbell("b45", 45));
      replaceMuscles(["Triceps"]);
    });
    // The heaviest remaining barbell is selected instead.
    expect(view.rows()).toEqual([
      ["45lbs", true],
      ["Triceps", true],
    ]);
    await view.click("Save");
    expect(env.alert).not.toHaveBeenCalled();
    expect(saved()).toMatchObject({
      barbellId: "b45",
      primaryMuscles: ["Triceps"],
    });
    view.unmount();
  });

  it("still saves after the last barbell was removed", async () => {
    const view = await render("e");
    await view.visit(() => setBarbells());
    await view.click("Save");
    expect(env.alert).not.toHaveBeenCalled();
    expect(saved()).toMatchObject({ loadKind: "BARBELL", barbellId: null });
    view.unmount();
  });

  it("still refuses to overwrite other changes made meanwhile", async () => {
    const view = await render("e");
    await view.visit(() =>
      write((db) =>
        db.runSync(
          "UPDATE exercises SET notes = 'Elsewhere', revision = revision + 1 WHERE id = 'e'",
        ),
      ),
    );
    await view.click("Save");
    expect(env.alert).toHaveBeenCalledWith(
      "Save Failed",
      expect.stringContaining("changed while the form was open"),
    );
    expect(saved()?.notes).toBe("Elsewhere");
    view.unmount();
  });
});
