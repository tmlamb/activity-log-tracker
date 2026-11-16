import type { PropsWithChildren } from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as BusyOverlayModule from "./BusyOverlay";
import SupportScreen from "~/app/(public)/(app)/support/index";

interface AlertButton {
  text: string;
  onPress?: () => void;
}

const env = vi.hoisted(() => ({
  alert: vi.fn(),
  back: vi.fn(),
  pick: vi.fn(),
  prepare: vi.fn(),
  restore: vi.fn(),
  overlay: () => undefined as string | undefined,
  painted: [] as (() => void)[],
}));

vi.mock("react-native", () => ({
  Alert: { alert: env.alert },
  ActivityIndicator: () => <i>spinner</i>,
  ScrollView: ({ children }: PropsWithChildren) => <div>{children}</div>,
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
    Toolbar: Object.assign(() => null, { Button: () => null }),
  },
  useRouter: () => ({ back: env.back }),
}));
vi.mock("expo-updates", () => ({}));
vi.mock("~/components/CardRow", () => ({
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
}));
vi.mock("~/components/ConfirmButton", () => ({ default: () => null }));
vi.mock("~/components/header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
  headerIcons: { insights: { uri: "icon" }, plus: { uri: "icon" } },
}));
vi.mock("~/components/Typography", () => ({ HelperText: () => null }));
vi.mock("~/components/font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("~/data/actions", () => ({
  exportBackup: vi.fn(),
  resetApplicationData: vi.fn(),
  restoreApplicationData: env.restore,
}));
vi.mock("~/data/backup/prepare-restore", () => ({
  prepareApplicationRestore: env.prepare,
}));
vi.mock("~/utils/backup-file", () => ({
  downloadBackupFile: vi.fn(),
  pickBackupFileContents: env.pick,
}));
vi.mock("./BusyOverlay", async (importOriginal) => ({
  ...(await importOriginal<typeof BusyOverlayModule>()),
  afterNextPaint: () =>
    new Promise<void>((resolve) => {
      env.painted.push(resolve);
    }),
}));

vi.stubGlobal("__DEV__", true);
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function render() {
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(<SupportScreen />);
  });
  if (!renderer) throw new Error("Renderer not created");
  const root = renderer.root;
  env.overlay = () =>
    root
      .findAllByType("span")
      .flatMap((node) =>
        node.children.filter((child) => typeof child === "string"),
      )
      .find((text) => text.endsWith("…"));
  const press = async () => {
    await act(async () => {
      (
        root.findByProps({ "data-label": "Restore Backup Data" }).props as {
          onClick: () => void;
        }
      ).onClick();
      await Promise.resolve();
    });
  };
  const confirm = () => {
    const buttons = env.alert.mock.calls.at(-1)?.[2] as AlertButton[];
    act(() => {
      buttons.find((b) => b.text === "Restore Backup Data")?.onPress?.();
    });
  };
  /** Let the work that was waiting for the overlay to paint run. */
  const paint = async () => {
    await act(async () => {
      env.painted.shift()?.();
      await Promise.resolve();
    });
  };
  return { renderer, press, confirm, paint };
}
describe("support screen restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.painted = [];
    env.pick.mockResolvedValue("{}");
    env.prepare.mockReturnValue({ prepared: true });
  });

  it("shows progress while checking and while restoring a backup", async () => {
    const { renderer, press, confirm, paint } = render();
    await press();
    expect(env.overlay()).toBe("Checking backup…");
    expect(env.prepare).not.toHaveBeenCalled();
    await paint();
    expect(env.prepare).toHaveBeenCalledWith("{}");
    expect(env.overlay()).toBeUndefined();
    expect(env.alert).toHaveBeenCalledWith(
      "Restore Backup Data?",
      expect.any(String),
      expect.any(Array),
    );

    confirm();
    expect(env.overlay()).toBe("Restoring backup…");
    expect(env.restore).not.toHaveBeenCalled();
    await paint();
    expect(env.restore).toHaveBeenCalledWith({ prepared: true });
    expect(env.back).toHaveBeenCalledOnce();
    act(() => renderer.unmount());
  });

  it("clears progress and keeps the screen open when the restore fails", async () => {
    const { renderer, press, confirm, paint } = render();
    await press();
    await paint();
    env.restore.mockImplementation(() => {
      throw new Error("disk full");
    });
    confirm();
    await paint();
    expect(env.overlay()).toBeUndefined();
    expect(env.alert).toHaveBeenLastCalledWith(
      "Support Action Failed",
      "Your backup could not be restored. Your previous app data has been kept.",
    );
    expect(env.back).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
