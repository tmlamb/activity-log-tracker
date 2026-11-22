import type { PropsWithChildren } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { BarChartPoint } from "./BarChart";
import ProgramInsights from "./program-insights";

const env = vi.hoisted(() => ({ points: [] as BarChartPoint[] }));

vi.mock("react-native", () => ({
  ScrollView: ({ children }: PropsWithChildren) => <div>{children}</div>,
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("react-native-reanimated", () => ({
  default: {
    View: ({ children }: PropsWithChildren) => <div>{children}</div>,
  },
  FadeIn: { duration: () => undefined },
}));
vi.mock("./BarChart", () => ({
  default: ({ points }: { points: BarChartPoint[] }) => {
    env.points = points;
    return null;
  },
  formatBarChartValue: (value: number) => String(value),
}));
vi.mock("./Card", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./CardRow", () => ({ DetailCardRow: () => null }));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("./PressableThemed", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
}));

const metrics = (sets: number) => ({
  sets,
  reps: sets * 8,
  volumeLbs: sets * 800,
  hardSets: 0,
  easySets: 0,
});

describe("program insights", () => {
  it("shows drop sets as muted segments on top of each week's bar", () => {
    act(() => {
      create(
        <ProgramInsights
          programName="Strength"
          insights={{
            muscleGroups: ["Chest"],
            weeks: [
              {
                week: 1,
                start: new Date(0),
                end: new Date(0),
                muscleGroups: [
                  {
                    muscleGroup: "Chest",
                    // 5 completed sets (2 drop), 3 pending (1 drop).
                    ...metrics(5),
                    pending: metrics(3),
                    drop: metrics(2),
                    dropPending: metrics(1),
                  },
                ],
              },
            ],
          }}
        />,
      );
    });
    const [point] = env.points;
    expect(point?.value).toBe(8);
    expect(point?.display).toMatchObject({
      type: "bar",
      tone: "primary",
      lines: [{ text: "3" }],
      pending: { value: 2, lines: [{ text: "2" }] },
      segments: [
        {
          value: 2,
          tone: "muted",
          lines: [{ text: "2" }, { text: "Drop" }],
        },
        {
          value: 1,
          tone: "muted",
          outline: "dotted",
          lines: [{ text: "1" }, { text: "Drop" }],
        },
      ],
    });
    expect(point?.accessibilityLabel).toContain(
      "including drop sets: 2 completed and 1 pending sets",
    );
  });
});
