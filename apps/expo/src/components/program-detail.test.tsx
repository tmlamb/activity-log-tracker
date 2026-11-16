import type { PropsWithChildren, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ProgramDetailScreen from "~/app/(public)/(app)/program/[programId]/index";

const { weekQuery } = vi.hoisted(() => ({ weekQuery: vi.fn() }));
vi.mock("react-native", () => ({
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("expo-router", () => ({
  Link: ({ children }: PropsWithChildren) => <>{children}</>,
  Redirect: () => <div>Redirect</div>,
  Stack: {
    Screen: () => null,
    Toolbar: Object.assign(() => null, { Button: () => null }),
  },
  useLocalSearchParams: () => ({ programId: "p" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@expo/vector-icons/MaterialCommunityIcons", () => ({
  default: () => null,
}));
vi.mock("~/data/queries", () => ({
  useProgramHeader: () => ({ id: "p", name: "Program" }),
  useProgramOverview: () => ({
    programId: "p",
    sessionCount: 2,
    programStartMs: new Date(2026, 0, 1, 12).getTime(),
    currentWeek: 2,
    weeks: [
      { week: 2, sessionCount: 1 },
      { week: 1, sessionCount: 1 },
    ],
  }),
  useProgramWeek: weekQuery,
}));
vi.mock("./BottomActionBar", () => ({
  default: () => <div>Plan Workout Session</div>,
}));
vi.mock("./CardRow", () => ({
  DetailCardRow: ({ value }: { value: ReactNode }) => <div>{value}</div>,
  NavigationCardRow: ({ title }: { title: ReactNode }) => <div>{title}</div>,
  PrimaryCardAction: ({ label }: { label: string }) => <div>{label}</div>,
}));
vi.mock("./CollapsibleSection", () => ({
  CollapsibleSection: ({
    title,
    collapsed,
    children,
  }: PropsWithChildren<{ title: string; collapsed: boolean }>) => (
    <section>
      <h2>{title}</h2>
      {collapsed ? null : children}
    </section>
  ),
  CollapsibleSectionList: ({
    data,
    renderItem,
    ListHeaderComponent,
  }: {
    data: { key: string }[];
    renderItem: (value: { item: { key: string } }) => ReactNode;
    ListHeaderComponent: ReactNode;
  }) => (
    <main>
      {ListHeaderComponent}
      {data.map((item) => (
        <div key={item.key}>{renderItem({ item })}</div>
      ))}
    </main>
  ),
}));
vi.mock("./font-scale-text", () => ({
  Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("react-native-css", () => ({ useNativeVariable: () => "#000" }));
vi.mock("./header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
  headerIcons: { insights: "chart.line.uptrend.xyaxis", plus: "plus" },
}));
vi.mock("./PressableThemed", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
  ScreenHeading: ({ children }: PropsWithChildren) => <h1>{children}</h1>,
  SectionHeading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));

describe("program timeline", () => {
  it("renders the current week and does not read collapsed history", () => {
    weekQuery.mockReset();
    weekQuery.mockReturnValue({
      week: 2,
      items: [{ id: "s", name: "Current session", day: 1, status: "Ready" }],
    });
    const output = renderToStaticMarkup(<ProgramDetailScreen />);
    expect(output).toContain("Week 2 (Now)");
    expect(output).toContain("Week 1");
    expect(output).toContain("Current session");
    expect(weekQuery).toHaveBeenCalledTimes(1);
    expect(weekQuery).toHaveBeenCalledWith("p", 2);
  });
});
