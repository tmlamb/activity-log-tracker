import { drizzle } from "drizzle-orm/sqlite-proxy";

type Parameter = string | number | null | Uint8Array;

/** The proxy executes on the queue-owned connection, inside its transaction. */
export interface DrizzleTransactionExecutor {
  getAllAsync<T>(sql: string, ...parameters: Parameter[]): Promise<T[]>;
  runAsync(sql: string, ...parameters: Parameter[]): Promise<unknown>;
}

/**
 * Only call within a managed read/write job. Query projections must use unique
 * column names: the Expo async executor returns named rows, which the proxy maps
 * back into Drizzle's positional result format.
 */
export function drizzleTransaction(executor: DrizzleTransactionExecutor) {
  return drizzle(async (statement, params: unknown[], method) => {
    const parameters = params.map((value): Parameter => {
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        value instanceof Uint8Array
      )
        return value;
      throw new Error("Unsupported SQLite parameter.");
    });
    if (method === "run") {
      await executor.runAsync(statement, ...parameters);
      return { rows: [] };
    }
    if (method === "get")
      throw new Error("Use all() for transaction-bound Drizzle reads.");
    const rows = await executor.getAllAsync<Record<string, unknown>>(
      statement,
      ...parameters,
    );
    const values = rows.map((row) => Object.values(row));
    return { rows: values };
  });
}
