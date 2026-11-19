import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import ConfirmButton from "./ConfirmButton";

const env = vi.hoisted(() => ({ alert: vi.fn() }));
vi.mock("react-native", () => ({ Alert: { alert: env.alert } }));
vi.mock("./Card", () => ({ default: () => null }));
vi.mock("./font-scale-text", () => ({ Text: () => null }));
vi.mock("./PressableThemed", () => ({
  default: ({ onPress }: { onPress: () => void }) => (
    <button onClick={onPress} />
  ),
}));

type Buttons = { text: string; onPress?: () => void }[];

describe("confirm button", () => {
  it("opens one confirmation at a time", () => {
    const onConfirm = vi.fn();
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(
        <ConfirmButton
          title="Delete?"
          message="Sure?"
          confirmText="Delete"
          accessibilityLabel="Delete"
          onConfirm={onConfirm}
        >
          Delete
        </ConfirmButton>,
      );
    });
    const press = () =>
      (
        renderer?.root.findByType("button").props as { onClick: () => void }
      ).onClick();
    press();
    press();
    expect(env.alert).toHaveBeenCalledOnce();
    // Cancelling allows asking again; confirming runs once.
    (env.alert.mock.calls[0]?.[2] as Buttons)[0]?.onPress?.();
    press();
    expect(env.alert).toHaveBeenCalledTimes(2);
    (env.alert.mock.calls[1]?.[2] as Buttons)[1]?.onPress?.();
    expect(onConfirm).toHaveBeenCalledOnce();
    act(() => renderer?.unmount());
  });
});
