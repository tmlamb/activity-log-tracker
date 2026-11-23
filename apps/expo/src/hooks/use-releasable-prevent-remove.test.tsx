import { useEffect } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useReleasablePreventRemove from "./use-releasable-prevent-remove";

const env = vi.hoisted(() => {
  const listeners: Partial<Record<string, () => void>> = {};
  return {
    listeners,
    nativeRepeat: vi.fn(),
    disablePrevention: vi.fn(),
    preventRemove: null as null | boolean,
    onPrevented: null as null | ((event: { repeat: () => void }) => void),
  };
});
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({
    addListener: (event: string, listener: () => void) => {
      env.listeners[event] = listener;
      return () => undefined;
    },
  }),
  usePreventRemove: (
    enabled: boolean,
    callback: (event: { repeat: () => void }) => void,
  ) => {
    env.preventRemove = enabled;
    env.onPrevented = callback;
    return env.disablePrevention;
  },
}));

type Result = ReturnType<typeof useReleasablePreventRemove>;
let result: Result | undefined;
const onResult = (value: Result) => {
  result = value;
};
const onPrevented = vi.fn<(event: { repeat: () => void }) => void>();
const onRearm = vi.fn();
function Screen({ preventRemove = true }: { preventRemove?: boolean }) {
  const value = useReleasablePreventRemove(preventRemove, onPrevented, {
    onRearm,
  });
  useEffect(() => onResult(value));
  return null;
}
function release() {
  if (!result) throw new Error("Not rendered");
  const { release: run } = result;
  act(() => run());
}
function emit(event: "blur" | "focus") {
  act(() => env.listeners[event]?.());
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  env.nativeRepeat.mockClear();
  env.disablePrevention.mockClear();
  env.preventRemove = null;
  env.onPrevented = null;
  onPrevented.mockReset();
  onRearm.mockClear();
  result = undefined;
  for (const key of Object.keys(env.listeners)) delete env.listeners[key];
  act(() => {
    create(<Screen />);
  });
});
afterEach(() => vi.useRealTimers());

describe("releasable prevent remove", () => {
  it("prevents removal only while asked to", () => {
    expect(env.preventRemove).toBe(true);
    act(() => {
      create(<Screen preventRemove={false} />);
    });
    expect(env.preventRemove).toBe(false);
  });

  it("stops preventing before the caller navigates away", () => {
    release();
    expect(env.disablePrevention).toHaveBeenCalledOnce();
    expect(env.preventRemove).toBe(false);
  });

  it("releases when a blocked action is repeated", () => {
    onPrevented.mockImplementation(({ repeat }) => repeat());
    act(() => env.onPrevented?.({ repeat: env.nativeRepeat }));
    expect(env.nativeRepeat).toHaveBeenCalledOnce();
    expect(env.preventRemove).toBe(false);
  });

  it("leaves a blocked action alone until it is repeated", () => {
    act(() => env.onPrevented?.({ repeat: env.nativeRepeat }));
    expect(onPrevented).toHaveBeenCalledOnce();
    expect(env.nativeRepeat).not.toHaveBeenCalled();
    expect(env.preventRemove).toBe(true);
  });

  it("protects the screen again when the navigation never happened", () => {
    release();
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(env.preventRemove).toBe(false);
    expect(onRearm).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(env.preventRemove).toBe(true);
    expect(onRearm).toHaveBeenCalledOnce();
  });

  it("stays released while the screen is left, then protects it on return", () => {
    release();
    emit("blur");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(env.preventRemove).toBe(false);
    expect(onRearm).not.toHaveBeenCalled();
    emit("focus");
    expect(env.preventRemove).toBe(true);
    expect(onRearm).toHaveBeenCalledOnce();
  });

  it("ignores focus changes that did not follow a release", () => {
    emit("blur");
    emit("focus");
    expect(onRearm).not.toHaveBeenCalled();
    expect(env.preventRemove).toBe(true);
  });
});
