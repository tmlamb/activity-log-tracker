import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTestDb } from "./database/test-db";
import { listProgramSummaries } from "./repositories/programs";
import { setDatabase, useGeneration, useRead, write } from "./store";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const navigation = vi.hoisted(() => ({ focused: true }));
vi.mock("expo-router/react-navigation", () => ({
  useIsFocused: () => navigation.focused,
}));

afterEach(() => {
  navigation.focused = true;
  setDatabase(undefined);
});

function Programs({ onRender }: { onRender: (names: string[]) => void }) {
  const programs = useRead(listProgramSummaries);
  onRender(programs.map(({ name }) => name));
  return null;
}

describe("store", () => {
  it("re-reads after a committed write and not after a failed one", () => {
    const db = createTestDb();
    setDatabase(db);
    const renders: string[][] = [];
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(<Programs onRender={(names) => renders.push(names)} />);
    });
    expect(renders).toEqual([[]]);

    act(() => {
      write((d) =>
        d.runSync("INSERT INTO programs VALUES ('p', 'Strength', 0)"),
      );
    });
    expect(renders.at(-1)).toEqual(["Strength"]);

    const count = renders.length;
    act(() => {
      expect(() =>
        write((d) => {
          d.runSync("INSERT INTO programs VALUES ('q', 'Rolled back', 1)");
          throw new Error("failed");
        }),
      ).toThrow("failed");
    });
    expect(renders.length).toBe(count);
    expect(
      db.raw.prepare("SELECT COUNT(*) AS count FROM programs").get(),
    ).toEqual({ count: 1 });
    act(() => renderer?.unmount());
    db.raw.close();
  });

  it("re-reads in the background while covered, without waiting for focus", () => {
    const db = createTestDb();
    setDatabase(db);
    const renders: string[][] = [];
    let renderer: ReturnType<typeof create> | undefined;
    const element = () => (
      <Programs onRender={(names) => renders.push(names)} />
    );
    act(() => {
      renderer = create(element());
    });
    navigation.focused = false;
    act(() => renderer?.update(element()));
    act(() => {
      write((d) =>
        d.runSync("INSERT INTO programs VALUES ('p', 'Strength', 0)"),
      );
    });
    expect(renders.at(-1)).toEqual(["Strength"]);
    // Regaining focus doesn't read again.
    const count = renders.length;
    navigation.focused = true;
    act(() => renderer?.update(element()));
    expect(renders.length).toBe(count + 1);
    expect(renders.at(-1)).toEqual(["Strength"]);
    act(() => renderer?.unmount());
    db.raw.close();
  });

  it("advances the generation when the database is replaced", () => {
    const seen: number[] = [];
    function Generation() {
      seen.push(useGeneration());
      return null;
    }
    act(() => {
      create(<Generation />);
    });
    act(() => setDatabase(createTestDb()));
    expect(seen.at(-1)).toBe((seen[0] ?? 0) + 1);
  });
});
