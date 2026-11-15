import { describe, expect, it, vi } from "vitest";

import { createRuntimeLeaseManager } from "./runtime-leases";

describe("runtime leases", () => {
  it("reuses one runtime across immediate remounts and closes after the final lease", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockResolvedValue({ close });
    const manager = createRuntimeLeaseManager(open);
    const first = manager.acquire();
    first.release();
    const second = manager.acquire();
    expect(await first.runtime).toBe(await second.runtime);
    expect(open).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(close).not.toHaveBeenCalled();
    second.release();
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it("waits for an abandoned runtime to close before reopening", async () => {
    let finishClose: (() => void) | undefined;
    const closing = new Promise<void>((resolve) => {
      finishClose = resolve;
    });
    const open = vi
      .fn()
      .mockResolvedValueOnce({ close: () => closing })
      .mockResolvedValueOnce({ close: () => Promise.resolve() });
    const manager = createRuntimeLeaseManager(open);
    const first = manager.acquire();
    await first.runtime;
    first.release();
    await Promise.resolve();
    const second = manager.acquire();
    await Promise.resolve();
    expect(open).toHaveBeenCalledTimes(1);
    finishClose?.();
    await second.runtime;
    expect(open).toHaveBeenCalledTimes(2);
    second.release();
  });

  it("allows retry after an initialization failure", async () => {
    const open = vi
      .fn()
      .mockRejectedValueOnce(new Error("open failed"))
      .mockResolvedValueOnce({ close: () => Promise.resolve() });
    const manager = createRuntimeLeaseManager(open);
    const first = manager.acquire();
    await expect(first.runtime).rejects.toThrow("open failed");
    first.release();
    const second = manager.acquire();
    await expect(second.runtime).resolves.toBeDefined();
    second.release();
  });
});
