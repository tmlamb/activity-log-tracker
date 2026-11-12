import { openDatabaseAsync } from "expo-sqlite";

import { createTransactionQueue } from "./transactions";

const DATABASE_NAME = "activity-log.sqlite";

/** Open private connections; callers must not issue SQL outside their queues. */
export async function openApplicationDatabase() {
  const writer = await openDatabaseAsync(DATABASE_NAME, {
    useNewConnection: true,
  });
  let reader: Awaited<ReturnType<typeof openDatabaseAsync>> | undefined;
  try {
    await writer.execAsync(
      "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;",
    );
    const foreignKeys = await writer.getFirstAsync<{ foreign_keys: number }>(
      "PRAGMA foreign_keys",
    );
    const journal = await writer.getFirstAsync<{ journal_mode: string }>(
      "PRAGMA journal_mode",
    );
    if (foreignKeys?.foreign_keys !== 1 || journal?.journal_mode !== "wal") {
      throw new Error("The workout database could not be configured safely.");
    }
    reader = await openDatabaseAsync(DATABASE_NAME, {
      useNewConnection: true,
    });
    await reader.execAsync(
      "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA query_only = ON;",
    );
    const read = createTransactionQueue(reader, "BEGIN");
    const write = createTransactionQueue(writer, "BEGIN IMMEDIATE");
    const readerConnection = reader;
    return {
      read,
      write,
      close: async () => {
        await readerConnection.closeAsync();
        await writer.closeAsync();
      },
    };
  } catch (error) {
    await reader?.closeAsync();
    await writer.closeAsync();
    throw error;
  }
}
