import { useEffect } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useUnsavedChangesWarning from "./use-unsaved-changes-warning";

interface AlertButton {
  text: string;
  onPress?: () => void;
}

const env = vi.hoisted(() => ({
  alert: vi.fn<(title: string, message: string, buttons: unknown[]) => void>(),
  repeat: vi.fn(),
  disablePrevention: vi.fn(),
  preventRemove: null as null | boolean,
  onPrevented: null as
    | null
    | ((event: { data: { action: unknown }; repeat: () => void }) => void),
}));
vi.mock("react-native", () => ({ Alert: { alert: env.alert } }));
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({ addListener: () => () => undefined }),
  usePreventRemove: (
    enabled: boolean,
    callback: (event: {
      data: { action: unknown };
      repeat: () => void;
    }) => void,
  ) => {
    env.preventRemove = enabled;
    env.onPrevented = callback;
    return env.disablePrevention;
  },
}));

type Warning = ReturnType<typeof useUnsavedChangesWarning>;
let warning: Warning | undefined;
const onWarning = (value: Warning) => {
  warning = value;
};
function Form({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) {
  const value = useUnsavedChangesWarning(hasUnsavedChanges);
  useEffect(() => onWarning(value), [value]);
  return null;
}
function current() {
  if (!warning) throw new Error("Not rendered");
  return warning;
}
function block() {
  act(() =>
    env.onPrevented?.({
      data: { action: { type: "GO_BACK" } },
      repeat: env.repeat,
    }),
  );
}
function alertButton(text: string) {
  const buttons = env.alert.mock.lastCall?.[2] as AlertButton[] | undefined;
  const button = buttons?.find((candidate) => candidate.text === text);
  if (!button) throw new Error(`No "${text}" button`);
  return button;
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  env.alert.mockClear();
  env.repeat.mockClear();
  env.disablePrevention.mockClear();
  env.preventRemove = null;
  env.onPrevented = null;
  warning = undefined;
});

afterEach(() => vi.useRealTimers());

describe("unsaved changes warning", () => {
  it("only prevents leaving while there are unsaved changes", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<Form hasUnsavedChanges={false} />);
    });
    expect(env.preventRemove).toBe(false);
    act(() => renderer.update(<Form hasUnsavedChanges />));
    expect(env.preventRemove).toBe(true);
  });

  it("stays on the form when the user keeps editing", () => {
    act(() => {
      create(<Form hasUnsavedChanges />);
    });
    block();
    expect(env.alert).toHaveBeenCalledOnce();
    act(() => alertButton("Keep Editing").onPress?.());
    expect(env.repeat).not.toHaveBeenCalled();
    expect(env.preventRemove).toBe(true);
  });

  it("continues the blocked navigation when changes are discarded", () => {
    act(() => {
      create(<Form hasUnsavedChanges />);
    });
    block();
    act(() => alertButton("Discard Changes").onPress?.());
    expect(env.repeat).toHaveBeenCalledOnce();
    expect(env.preventRemove).toBe(false);
  });

  it("leaves after a save without warning", () => {
    act(() => {
      create(<Form hasUnsavedChanges />);
    });
    const navigate = vi.fn();
    expect(current().hasLeft()).toBe(false);
    act(() => current().leaveWithoutWarning(navigate));
    expect(env.disablePrevention).toHaveBeenCalledOnce();
    expect(env.disablePrevention.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0] ?? 0,
    );
    expect(env.preventRemove).toBe(false);
    expect(current().hasLeft()).toBe(true);
    expect(env.alert).not.toHaveBeenCalled();
  });

  it("warns and saves again if leaving after a save never happened", () => {
    act(() => {
      create(<Form hasUnsavedChanges />);
    });
    act(() => current().leaveWithoutWarning(() => undefined));
    expect(current().hasLeft()).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(env.preventRemove).toBe(true);
    expect(current().hasLeft()).toBe(false);
  });
});
