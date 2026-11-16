import type { PropsWithChildren } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ProgramFormScreen from "~/app/(public)/(app)/program/form/index";

const environment = vi.hoisted(() => ({
  programId: undefined as string | undefined,
  program: null as { id: string; name: string } | null,
}));
vi.mock("react-native-get-random-values", () => ({}));
vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
  ScrollView: ({ children }: PropsWithChildren) => <div>{children}</div>,
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("expo-router", () => ({
  Redirect: () => <div>Redirect</div>,
  Stack: {
    Screen: () => null,
    Toolbar: Object.assign(() => null, { Button: () => null }),
  },
  useLocalSearchParams: () => ({ programId: environment.programId }),
  useRouter: () => ({ back: vi.fn() }),
}));
vi.mock("~/hooks/use-unsaved-changes-warning", async () => {
  const { useRef } = await import("react");
  return {
    default: function useUnsavedChangesWarning() {
      const left = useRef(false);
      return {
        leaveWithoutWarning: (navigate: () => void) => {
          left.current = true;
          navigate();
        },
        hasLeft: () => left.current,
      };
    },
  };
});
vi.mock("~/data/queries", () => ({
  useProgramHeader: () => environment.program,
}));
vi.mock("~/data/actions", () => ({
  createProgram: vi.fn(),
  renameProgram: vi.fn(),
  deleteProgram: vi.fn(),
}));
vi.mock("./ConfirmButton", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("./header-toolbar", () => ({
  useHeaderButtonProps: () => () => ({}),
  headerIcons: { insights: "chart.bar.xaxis.ascending", plus: "plus" },
}));
vi.mock("./MultilineTextInputThemed", () => ({
  default: ({ value }: { value: string }) => <input value={value} readOnly />,
}));
vi.mock("./Typography", () => ({
  HelperText: ({ children }: PropsWithChildren) => <p>{children}</p>,
}));

describe("program editor initialization", () => {
  it("redirects when the edited program does not exist", () => {
    environment.programId = "p";
    environment.program = null;
    const output = renderToStaticMarkup(<ProgramFormScreen />);
    expect(output).toContain("Redirect");
    expect(output).not.toContain("<input");
  });

  it("initializes the edit form from the program header", () => {
    environment.programId = "p";
    environment.program = { id: "p", name: "Existing program" };
    const output = renderToStaticMarkup(<ProgramFormScreen />);
    expect(output).toContain('value="Existing program"');
    expect(output).toContain("Delete This Program");
  });

  it("starts a blank form when creating a program", () => {
    environment.programId = undefined;
    environment.program = null;
    const output = renderToStaticMarkup(<ProgramFormScreen />);
    expect(output).toContain('value=""');
    expect(output).not.toContain("Delete This Program");
  });
});
