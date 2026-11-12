/** The minimal connection operations needed to own a transaction. */
export interface TransactionConnection {
  execAsync(sql: string): Promise<void>;
}

/**
 * A connection must be private to its queue: unrelated statements issued while a
 * transaction awaits would otherwise become part of that transaction.
 */
export function createTransactionQueue<T extends TransactionConnection>(
  connection: T,
  begin: "BEGIN" | "BEGIN IMMEDIATE",
) {
  let pending: Promise<void> = Promise.resolve();
  let unusable = false;

  return function transact<Result>(
    job: (transaction: T) => Promise<Result>,
  ): Promise<Result> {
    const result = pending.then(async () => {
      if (unusable) {
        throw new Error(
          "The database connection must be reopened after a failed rollback.",
        );
      }
      await connection.execAsync(begin);
      try {
        const value = await job(connection);
        await connection.execAsync("COMMIT");
        return value;
      } catch (error) {
        try {
          await connection.execAsync("ROLLBACK");
        } catch (rollbackError) {
          unusable = true;
          throw new AggregateError(
            [error, rollbackError],
            "The transaction failed and could not be rolled back.",
          );
        }
        throw error;
      }
    });
    pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
