import { useEffect } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useRouter from "./use-router";

const env = vi.hoisted(() => {
  const listeners: Partial<Record<string, () => void>> = {};
  return { back: vi.fn(), push: vi.fn(), listeners };
});
vi.mock("expo-router", () => ({
  useRouter: () => ({ back: env.back, push: env.push }),
}));
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({
    addListener: (event: string, listener: () => void) => {
      env.listeners[event] = listener;
      return () => undefined;
    },
  }),
}));

let router: ReturnType<typeof useRouter> | undefined;
function Screen({
  onRouter,
}: {
  onRouter: (value: ReturnType<typeof useRouter>) => void;
}) {
  const value = useRouter();
  useEffect(() => onRouter(value), [onRouter, value]);
  return null;
}
function current() {
  if (!router) throw new Error("Not rendered");
  return router;
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  env.back.mockClear();
  env.push.mockClear();
  for (const key of Object.keys(env.listeners)) delete env.listeners[key];
  act(() => {
    create(
      <Screen
        onRouter={(value) => {
          router = value;
        }}
      />,
    );
  });
});
afterEach(() => vi.useRealTimers());

describe("guarded router", () => {
  it("ignores a second press's navigation but runs every call in one press", async () => {
    current().back();
    current().back();
    expect(env.back).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    // A later press, before the screen has gone, does nothing.
    current().back();
    current().push("/(public)/(app)");
    expect(env.back).toHaveBeenCalledTimes(2);
    expect(env.push).not.toHaveBeenCalled();
    expect(current().isNavigating()).toBe(true);
  });

  it("unlocks when the screen returns to focus after leaving", async () => {
    current().push("/(public)/(app)");
    await Promise.resolve();
    env.listeners.blur?.();
    // Still covered well after the fallback delay: stay locked.
    vi.advanceTimersByTime(5000);
    current().push("/(public)/(app)");
    expect(env.push).toHaveBeenCalledOnce();
    env.listeners.focus?.();
    current().push("/(public)/(app)");
    expect(env.push).toHaveBeenCalledTimes(2);
  });

  it("unlocks after a navigation that never left the screen", async () => {
    current().back();
    await Promise.resolve();
    vi.advanceTimersByTime(1000);
    current().back();
    expect(env.back).toHaveBeenCalledTimes(2);
  });
});
