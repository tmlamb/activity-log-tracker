/** Share initialization across Strict Mode remounts and serialize close/reopen. */
export function createRuntimeLeaseManager<T extends { close(): Promise<void> }>(
  open: () => Promise<T>,
) {
  let current: { users: number; promise: Promise<T> } | undefined;
  let closing: Promise<void> = Promise.resolve();
  return {
    acquire() {
      if (!current) {
        const entry = { users: 0, promise: closing.then(open) };
        current = entry;
        void entry.promise.catch(() => {
          if (current === entry) current = undefined;
        });
      }
      const entry = current;
      entry.users++;
      let released = false;
      return {
        runtime: entry.promise,
        release() {
          if (released) return;
          released = true;
          entry.users--;
          queueMicrotask(() => {
            if (entry.users !== 0 || current !== entry) return;
            current = undefined;
            closing = entry.promise.then(
              (runtime) => runtime.close(),
              () => undefined,
            );
            // Preserve the rejected close as a barrier for future opens.
            void closing.catch(() => undefined);
          });
        },
      };
    },
  };
}
