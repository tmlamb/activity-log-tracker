import { describe, expect, it } from "vitest";

import { createTransactionQueue } from "./transactions";

describe("transaction queue", () => {
  it("does not interleave transactions when jobs await", async () => {
    const operations: string[] = [];
    const transact = createTransactionQueue(
      {
        execAsync: (sql) => {
          operations.push(sql);
          return Promise.resolve();
        },
      },
      "BEGIN IMMEDIATE",
    );
    let release: (() => void) | undefined;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = transact(async () => {
      operations.push("first");
      await wait;
    });
    const second = transact(() => {
      operations.push("second");
      return Promise.resolve();
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(operations).toEqual(["BEGIN IMMEDIATE", "first"]);
    release?.();
    await Promise.all([first, second]);
    expect(operations).toEqual([
      "BEGIN IMMEDIATE",
      "first",
      "COMMIT",
      "BEGIN IMMEDIATE",
      "second",
      "COMMIT",
    ]);
  });

  it("rolls back a failing job and continues with the next job", async () => {
    const operations: string[] = [];
    const transact = createTransactionQueue(
      {
        execAsync: (sql) => {
          operations.push(sql);
          return Promise.resolve();
        },
      },
      "BEGIN IMMEDIATE",
    );
    await expect(
      transact(() => Promise.reject(new Error("write failed"))),
    ).rejects.toThrow("write failed");
    await expect(transact(() => Promise.resolve(42))).resolves.toBe(42);
    expect(operations).toEqual([
      "BEGIN IMMEDIATE",
      "ROLLBACK",
      "BEGIN IMMEDIATE",
      "COMMIT",
    ]);
  });

  it("refuses further jobs after a rollback fails", async () => {
    const transact = createTransactionQueue(
      {
        execAsync: (sql) =>
          sql === "ROLLBACK"
            ? Promise.reject(new Error("rollback failed"))
            : Promise.resolve(),
      },
      "BEGIN IMMEDIATE",
    );
    await expect(
      transact(() => Promise.reject(new Error("write failed"))),
    ).rejects.toThrow("could not be rolled back");
    await expect(transact(() => Promise.resolve())).rejects.toThrow(
      "must be reopened",
    );
  });
});
