import type { PropsWithChildren, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ApplicationDataRuntime } from "./application-data";
import DashboardScreen from "../../app/(public)/(app)/index";
import ProgramSettingsScreen from "../../app/(public)/(app)/program/settings/index";
import { workoutKeys } from "../cache/keys";
import { createWorkoutQueryClient } from "../cache/query-client";
import { ApplicationDataProvider } from "./application-data";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => true }));
vi.mock("~/utils/posthog", () => ({ captureException: vi.fn() }));
vi.mock("expo-router", () => {
  const Passthrough = ({ children }: PropsWithChildren) => <>{children}</>;
  const Toolbar = Object.assign(Passthrough, {
    Menu: Passthrough,
    Label: Passthrough,
    MenuAction: Passthrough,
  });
  return {
    Link: Passthrough,
    Stack: { Toolbar, Screen: () => null },
    useRouter: () => ({ push: vi.fn() }),
  };
});
vi.mock("~/components/CardRow", () => ({
  NavigationCardRow: ({
    title,
    trailingText,
  }: {
    title: ReactNode;
    trailingText?: ReactNode;
  }) => (
    <div>
      {title} {trailingText}
    </div>
  ),
  PrimaryCardAction: ({ label }: { label: string }) => <div>{label}</div>,
}));
vi.mock("~/components/HeaderAction", () => ({
  HeaderPlusAction: () => <div>Add</div>,
}));
vi.mock("~/components/Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
  SectionHeading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));
vi.mock("~/components/Styled", () => ({
  LegendListStyled: ({
    data,
    renderItem,
    ListHeaderComponent,
    ListFooterComponent,
  }: {
    data: { id: string }[];
    renderItem: (info: { item: { id: string }; index: number }) => ReactNode;
    ListHeaderComponent?: ReactNode;
    ListFooterComponent?: ReactNode;
  }) => (
    <main>
      {ListHeaderComponent}
      {data.map((item, index) => (
        <div key={item.id}>{renderItem({ item, index })}</div>
      ))}
      {ListFooterComponent}
    </main>
  ),
}));

function setup() {
  const cache = createWorkoutQueryClient();
  const service = { listPrograms: vi.fn() };
  const snapshot = { generation: 5, service };
  const runtime = {
    cache,
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
  } as unknown as ApplicationDataRuntime;
  return { cache, runtime, service };
}

describe("SQLite program screens", () => {
  it("renders shared SQLite summaries and counts", () => {
    const { cache, runtime } = setup();
    cache.setQueryData(workoutKeys.programs(5), [
      { id: "p1", name: "First", sessionCount: 2 },
      { id: "p2", name: "Second", sessionCount: 1 },
    ]);
    const dashboard = renderToStaticMarkup(
      <ApplicationDataProvider runtime={runtime}>
        <DashboardScreen />
      </ApplicationDataProvider>,
    );
    const settings = renderToStaticMarkup(
      <ApplicationDataProvider runtime={runtime}>
        <ProgramSettingsScreen />
      </ApplicationDataProvider>,
    );
    expect(dashboard).toContain("First");
    expect(dashboard).toContain("Second");
    expect(dashboard).toContain("Select a program");
    expect(settings).toContain("2 sessions");
    expect(settings).toContain("1 session");
    cache.clear();
  });

  it("shows a loading state instead of treating an unresolved query as an empty dataset", () => {
    const { cache, runtime } = setup();
    const output = renderToStaticMarkup(
      <ApplicationDataProvider runtime={runtime}>
        <DashboardScreen />
      </ApplicationDataProvider>,
    );
    expect(output).toContain("Loading workout data");
    expect(output).not.toContain("Create Workout Program");
    cache.clear();
  });

  it("shows a retryable error when the initial SQLite read fails", async () => {
    const { cache, runtime } = setup();
    await expect(
      cache.fetchQuery({
        queryKey: workoutKeys.programs(5),
        queryFn: () => Promise.reject(new Error("storage unavailable")),
      }),
    ).rejects.toThrow("storage unavailable");
    const output = renderToStaticMarkup(
      <ApplicationDataProvider runtime={runtime}>
        <DashboardScreen />
      </ApplicationDataProvider>,
    );
    expect(output).toContain("Unable to load workout data");
    expect(output).toContain("Try Again");
    expect(output).not.toContain("Create Workout Program");
    cache.clear();
  });
});
