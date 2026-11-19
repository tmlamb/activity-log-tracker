import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import ProgramInsightsScreen from "~/app/(public)/(app)/program/[programId]/insights/index";

const env = vi.hoisted(() => ({
  painted: [] as (() => void)[],
  read: vi.fn(),
}));

vi.mock("react-native", () => ({
  ActivityIndicator: () => <i>spinner</i>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({ addListener: () => () => undefined }),
  useIsFocused: () => true,
}));
vi.mock("expo-router", () => ({
  Redirect: () => <p>redirect</p>,
  useLocalSearchParams: () => ({ programId: "p" }),
}));
vi.mock("~/components/BusyOverlay", () => ({
  afterNextPaint: () =>
    new Promise<void>((resolve) => {
      env.painted.push(resolve);
    }),
}));
vi.mock("~/components/program-insights", () => ({
  default: ({ programName }: { programName: string }) => <h1>{programName}</h1>,
}));
vi.mock("~/data/insight-presenters", () => ({
  presentProgramInsights: () => ({ weeks: [], muscleGroups: [] }),
}));
vi.mock("~/data/queries", () => ({
  useProgramInsights: (programId: string) => {
    env.read(programId);
    return { programName: "Strength", partial: false };
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("program insights screen", () => {
  it("shows a spinner until it has painted, then computes insights", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(<ProgramInsightsScreen />);
    });
    expect(JSON.stringify(renderer?.toJSON())).toContain("spinner");
    expect(env.read).not.toHaveBeenCalled();

    await act(async () => {
      env.painted.shift()?.();
      await Promise.resolve();
    });
    expect(env.read).toHaveBeenCalledWith("p");
    expect(JSON.stringify(renderer?.toJSON())).toContain("Strength");
    act(() => renderer?.unmount());
  });
});
