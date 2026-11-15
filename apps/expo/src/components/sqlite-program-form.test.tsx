import type { PropsWithChildren } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import { workoutKeys } from "~/data/cache/keys";
import { createWorkoutQueryClient } from "~/data/cache/query-client";
import { ApplicationDataProvider } from "~/data/react/application-data";
import { SQLiteProgramForm } from "./sqlite-program-form";

const environment = vi.hoisted(() => ({
  programId: "p",
}));
vi.mock("react-native-get-random-values", () => ({}));
vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
  ScrollView: ({ children }: PropsWithChildren) => <div>{children}</div>,
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => true }));
vi.mock("expo-router", () => ({
  Redirect: () => <div>Redirect</div>,
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ programId: environment.programId }),
  useRouter: () => ({ back: vi.fn() }),
}));
vi.mock("~/hooks/use-unsaved-changes-warning", () => ({
  default: () => (navigate: () => void) => navigate(),
}));
vi.mock("./ConfirmButton", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./HeaderAction", () => ({ HeaderTextAction: () => null }));
vi.mock("./MultilineTextInputThemed", () => ({
  default: ({ value }: { value: string }) => <input value={value} readOnly />,
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
}));
vi.mock("./CardRow", () => ({
  PrimaryCardAction: ({ label }: { label: string }) => <div>{label}</div>,
}));

function setup() {
  const cache = createWorkoutQueryClient();
  const snapshot = {
    generation: 2,
    service: {
      programHeader: vi.fn(),
      createProgram: vi.fn(),
      renameProgram: vi.fn(),
      deleteProgram: vi.fn(),
    },
  };
  const runtime = {
    cache,
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
  } as unknown as ApplicationDataRuntime;
  return { cache, runtime };
}

describe("SQLite program editor initialization", () => {
  it("waits for an edit seed rather than mounting a blank draft", () => {
    environment.programId = "p";
    const { cache, runtime } = setup();
    const output = renderToStaticMarkup(
      <ApplicationDataProvider runtime={runtime}>
        <SQLiteProgramForm runtime={runtime} />
      </ApplicationDataProvider>,
    );
    expect(output).toContain("Loading workout data");
    expect(output).not.toContain("<input");
    cache.clear();
  });

  it("initializes the edit form from the resolved program header", () => {
    environment.programId = "p";
    const { cache, runtime } = setup();
    cache.setQueryData(workoutKeys.programHeader(2, "p"), {
      id: "p",
      name: "Existing program",
    });
    const output = renderToStaticMarkup(
      <ApplicationDataProvider runtime={runtime}>
        <SQLiteProgramForm runtime={runtime} />
      </ApplicationDataProvider>,
    );
    expect(output).toContain('value="Existing program"');
    expect(output).toContain("Delete This Program");
    cache.clear();
  });
});
